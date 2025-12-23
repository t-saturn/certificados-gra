package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"server/internal/config"
	"server/internal/dto"
	"server/internal/models"
	"server/internal/repositories"
	"server/pkgs/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventActionService interface {
	RunEventAction(ctx context.Context, eventID uuid.UUID, action string, participantIDs []uuid.UUID) (jobID *string, created int, skipped int, updated int, err error)
}

type eventActionServiceImpl struct {
	db        *gorm.DB
	redisJobs repositories.RedisJobsRepository
	cfg       config.Config
}

func NewEventActionService(db *gorm.DB, redisJobs repositories.RedisJobsRepository, cfg config.Config) EventActionService {
	return &eventActionServiceImpl{db: db, redisJobs: redisJobs, cfg: cfg}
}

func normalizeAction(s string) string {
	return strings.TrimSpace(strings.ToLower(s))
}

// participantIDs vacío => todos los del evento (según EventParticipants)
func resolveParticipantIDs(ev models.Event, participantIDs []uuid.UUID) []uuid.UUID {
	valid := make(map[uuid.UUID]struct{}, len(ev.EventParticipants))
	for _, ep := range ev.EventParticipants {
		valid[ep.UserDetailID] = struct{}{}
	}

	// todos
	if len(participantIDs) == 0 {
		out := make([]uuid.UUID, 0, len(valid))
		for id := range valid {
			out = append(out, id)
		}
		return out
	}

	// filtrar + unique
	out := make([]uuid.UUID, 0, len(participantIDs))
	seen := make(map[uuid.UUID]struct{}, len(participantIDs))
	for _, id := range participantIDs {
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		if _, ok := valid[id]; ok {
			out = append(out, id)
		}
	}
	return out
}

/* -------------------- Serial & Verification -------------------- */

func makeSerial(evCode string, n int) string {
	// ejemplo: EVTCODE-000001
	return fmt.Sprintf("%s-%06d", evCode, n)
}

const verAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func newVerificationCode() (string, error) {
	b := make([]byte, 10)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, 10)
	for i := 0; i < 10; i++ {
		out[i] = verAlphabet[int(b[i])%len(verAlphabet)]
	}
	// ejemplo: CERT-XXXXXXXXXX (ajusta a tu formato si quieres)
	return fmt.Sprintf("CERT-%s", string(out)), nil
}

func getNextSerialCounter(ctx context.Context, tx *gorm.DB, evCode string) (int, error) {
	prefix := fmt.Sprintf("%s-", evCode)
	var maxN int64

	err := tx.WithContext(ctx).
		Table("documents").
		Select("COALESCE(MAX(CAST(RIGHT(serial_code, 6) AS INTEGER)), 0)").
		Where("serial_code LIKE ?", prefix+"%").
		Scan(&maxN).Error
	if err != nil {
		return 0, err
	}
	return int(maxN) + 1, nil
}

func isDuplicateErr(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint")
}

/* -------------------- Core: Generate Certificates (DB + Enqueue) -------------------- */

func (s *eventActionServiceImpl) RunEventAction(
	ctx context.Context,
	eventID uuid.UUID,
	action string,
	participantIDs []uuid.UUID,
) (*string, int, int, int, error) {
	act := normalizeAction(action)
	if act != "generate_certificates" {
		return nil, 0, 0, 0, fmt.Errorf("invalid action (only generate_certificates enabled)")
	}

	// 1) Cargar evento + participantes
	var ev models.Event
	if err := s.db.WithContext(ctx).
		Preload("EventParticipants").
		First(&ev, "id = ?", eventID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, 0, 0, fmt.Errorf("event not found")
		}
		return nil, 0, 0, 0, err
	}

	if ev.TemplateID == nil {
		return nil, 0, 0, 0, fmt.Errorf("event has no template_id")
	}
	tplID := *ev.TemplateID

	targetIDs := resolveParticipantIDs(ev, participantIDs)
	if len(targetIDs) == 0 {
		return nil, 0, 0, 0, fmt.Errorf("no valid participants for this event")
	}

	created := 0
	skipped := 0
	updated := 0

	// guardaremos docs para armar job (client_ref)
	docsForJob := make([]models.Document, 0, len(targetIDs))

	// 2) Transacción: crear documents si no existen
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		nextN, err := getNextSerialCounter(ctx, tx, ev.Code)
		if err != nil {
			return err
		}

		now := time.Now()

		for _, udID := range targetIDs {
			var existing models.Document
			findErr := tx.WithContext(ctx).
				Select("id", "user_detail_id", "verification_code").
				Where("event_id = ? AND user_detail_id = ? AND template_id = ?", ev.ID, udID, tplID).
				First(&existing).Error

			if findErr == nil {
				// ya existe, lo usamos para job
				skipped++
				docsForJob = append(docsForJob, existing)
				continue
			}
			if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return findErr
			}

			serial := makeSerial(ev.Code, nextN)
			nextN++

			// retry por colisiones (serial/verification únicos)
			var lastErr error
			for attempt := 0; attempt < 10; attempt++ {
				ver, verr := newVerificationCode()
				if verr != nil {
					return verr
				}

				doc := models.Document{
					ID:           uuid.New(),
					UserDetailID: udID,
					EventID:      &ev.ID,
					TemplateID:   &tplID,

					SerialCode:       serial,
					VerificationCode: ver,

					IssueDate: now,
					SignedAt:  nil,

					Status:                 "CREATED",
					DigitalSignatureStatus: "PENDING",

					RequiredSignatures: 1, // si luego tienes política por Event, aquí lo pones
					SignedSignatures:   0,

					CreatedBy: ev.CreatedBy,
					CreatedAt: now,
					UpdatedAt: now,
				}

				if err := tx.WithContext(ctx).Create(&doc).Error; err != nil {
					lastErr = err
					if isDuplicateErr(err) {
						continue
					}
					return err
				}

				created++
				docsForJob = append(docsForJob, doc)
				lastErr = nil
				break
			}

			if lastErr != nil {
				return fmt.Errorf("could not create document after retries: %w", lastErr)
			}
		}

		return nil
	})

	if err != nil {
		return nil, 0, 0, 0, err
	}

	// 3) Obtener template_file_id real (document_templates.file_id)
	var tpl models.DocumentTemplate
	if err := s.db.WithContext(ctx).
		Select("id", "file_id").
		First(&tpl, "id = ?", tplID).Error; err != nil {
		return nil, created, skipped, updated, err
	}

	// 4) Armar job para Rust
	jobUUID := uuid.New()

	// TODO: pásalo a config si quieres
	baseURL := "https://regionayacucho.gob.pe/verify"
	qrPdf := []map[string]any{
		{"qr_size_cm": "2.5"},
		{"qr_margin_y_cm": "1.0"},
		{"qr_margin_x_cm": "1.0"},
		{"qr_page": "0"},
		{"qr_rect": "460,40,540,120"},
	}

	items := make([]dto.DocItem, 0, len(docsForJob))
	for _, d := range docsForJob {
		// pdf fields mínimos (luego lo enriqueces con UserDetail)
		pdfFields := []dto.PdfField{
			{Key: "fecha", Value: time.Now().Format("02/01/2006")},
		}

		items = append(items, dto.DocItem{
			ClientRef: d.ID,
			Template:  tpl.FileID,     // IMPORTANTE: file_id del template
			UserID:    d.UserDetailID, // tu regla: user_id = UserDetailID
			IsPublic:  true,

			QR: []map[string]any{
				{"base_url": baseURL},
				{"verify_code": d.VerificationCode},
			},
			QRPdf: qrPdf,
			PDF:   pdfFields,
		})
	}

	job := dto.DocsGenerateJob{
		JobID:   jobUUID,
		JobType: "GENERATE_DOCS",
		EventID: ev.ID,
		Items:   items,
	}

	// 5) Crear meta en Redis (QUEUED)
	if err := s.redisJobs.CreateJobMeta(ctx, jobUUID.String(), len(items), s.cfg.REDISJobTTLSeconds); err != nil {
		return nil, created, skipped, updated, err
	}

	// 6) Encolar job en Redis
	if err := s.redisJobs.PushQueue(ctx, s.cfg.REDISQueueDocsGenerate, job); err != nil {
		return nil, created, skipped, updated, err
	}

	// 7) Marcar docs como PDF_QUEUED
	if err := s.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id IN ?", extractDocIDs(docsForJob)).
		Updates(map[string]any{
			"status":     "PDF_QUEUED",
			"updated_at": time.Now(),
		}).Error; err != nil {
		return nil, created, skipped, updated, err
	}

	logger.Log.Info().Msgf("queued rust job: job_id=%s total=%d queue=%s", jobUUID.String(), len(items), s.cfg.REDISQueueDocsGenerate)

	out := jobUUID.String()
	updated = created // en este paso, created = docs que ahora pasan a PDF_QUEUED (si prefieres otro cálculo, lo ajustas)
	return &out, created, skipped, updated, nil
}

func extractDocIDs(docs []models.Document) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(docs))
	for _, d := range docs {
		out = append(out, d.ID)
	}
	return out
}
