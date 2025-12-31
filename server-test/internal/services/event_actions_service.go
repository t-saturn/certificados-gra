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
	"gorm.io/gorm/clause"
)

type EventActionService interface {
	// qrRect: string tipo "460,40,540,120" (opcional)
	RunEventAction(
		ctx context.Context,
		eventID uuid.UUID,
		action string,
		participantIDs []uuid.UUID,
		qrRect *string,
	) (*string, int, int, int, error)
}

type eventActionServiceImpl struct {
	db                *gorm.DB
	queueRepo         repositories.PdfJobQueueRepository
	templateFieldRepo repositories.DocumentTemplateFieldRepository
	userDetailRepo    repositories.UserDetailRepository
}

func NewEventActionService(
	db *gorm.DB,
	queueRepo repositories.PdfJobQueueRepository,
	templateFieldRepo repositories.DocumentTemplateFieldRepository,
	userDetailRepo repositories.UserDetailRepository,
) EventActionService {
	return &eventActionServiceImpl{
		db:                db,
		queueRepo:         queueRepo,
		templateFieldRepo: templateFieldRepo,
		userDetailRepo:    userDetailRepo,
	}
}

func normalizeAction(s string) string { return strings.TrimSpace(strings.ToLower(s)) }

func resolveParticipantIDs(ev models.Event, participantIDs []uuid.UUID) []uuid.UUID {
	valid := make(map[uuid.UUID]struct{}, len(ev.EventParticipants))
	for _, ep := range ev.EventParticipants {
		valid[ep.UserDetailID] = struct{}{}
	}
	if len(participantIDs) == 0 {
		out := make([]uuid.UUID, 0, len(valid))
		for id := range valid {
			out = append(out, id)
		}
		return out
	}

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

func pickSeries(ev models.Event) string {
	series := strings.TrimSpace(ev.CertificateSeries)
	if series == "" {
		series = "CERT"
	}
	return series
}

func makeSerial(evCode, series string, n int) string {
	return fmt.Sprintf("%s-%s-%06d", evCode, series, n)
}

const verAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func newVerificationCode() (string, error) {
	b := make([]byte, 10)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, 10)
	for i := range out {
		out[i] = verAlphabet[int(b[i])%len(verAlphabet)]
	}
	return fmt.Sprintf("CERT-%s", string(out)), nil
}

func isDuplicateErr(err error) bool {
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint")
}

func getNextSerialCounter(ctx context.Context, tx *gorm.DB, evCode, series string) (int, error) {
	prefix := fmt.Sprintf("%s-%s-", evCode, series)
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

func buildDraftDocument(ev models.Event, userDetailID uuid.UUID, templateID uuid.UUID, serial, verification string, requiredSigs int) models.Document {
	now := time.Now()
	return models.Document{
		ID:                     uuid.New(),
		UserDetailID:           userDetailID,
		EventID:                &ev.ID,
		TemplateID:             &templateID,
		SerialCode:             serial,
		VerificationCode:       verification,
		IssueDate:              now,
		SignedAt:               nil,
		Status:                 "CREATED",
		DigitalSignatureStatus: "PENDING",
		RequiredSignatures:     requiredSigs,
		SignedSignatures:       0,
		PdfJobID:               nil,
		CreatedBy:              ev.CreatedBy,
		CreatedAt:              now,
		UpdatedAt:              now,
	}
}

func (s *eventActionServiceImpl) RunEventAction(
	ctx context.Context,
	eventID uuid.UUID,
	action string,
	participantIDs []uuid.UUID,
	qrRect *string,
) (*string, int, int, int, error) {
	act := normalizeAction(action)
	if act != "generate_certificates" {
		return nil, 0, 0, 0, fmt.Errorf("invalid action (only generate_certificates implemented)")
	}

	// 1) cargar evento + participantes
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

	targetIDs := resolveParticipantIDs(ev, participantIDs)
	if len(targetIDs) == 0 {
		return nil, 0, 0, 0, fmt.Errorf("no valid participants for this event")
	}

	created, skipped, updated := 0, 0, 0
	tplID := *ev.TemplateID

	// firma: por ahora 1 (si tu Event guarda esto, cámbialo)
	requiredSigs := 1

	// 2) tx crear docs si no existen
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// lock event
		if err := tx.WithContext(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&models.Event{}, "id = ?", ev.ID).Error; err != nil {
			return err
		}

		series := pickSeries(ev)
		nextN, err := getNextSerialCounter(ctx, tx, ev.Code, series)
		if err != nil {
			return err
		}

		for _, udID := range targetIDs {
			var existing models.Document
			findErr := tx.WithContext(ctx).
				Select("id").
				Where("event_id = ? AND user_detail_id = ? AND template_id = ?", ev.ID, udID, tplID).
				First(&existing).Error

			if findErr == nil {
				skipped++
				continue
			}
			if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return findErr
			}

			serial := makeSerial(ev.Code, series, nextN)
			nextN++

			var lastErr error
			for attempt := 0; attempt < 10; attempt++ {
				ver, verr := newVerificationCode()
				if verr != nil {
					return verr
				}
				doc := buildDraftDocument(ev, udID, tplID, serial, ver, requiredSigs)
				if err := tx.WithContext(ctx).Create(&doc).Error; err != nil {
					lastErr = err
					if isDuplicateErr(err) {
						continue
					}
					return err
				}
				created++
				lastErr = nil
				break
			}
			if lastErr != nil {
				return fmt.Errorf("could not create document after retries: %w", lastErr)
			}
		}

		// updated = cuantos docs están en ese set
		res := tx.WithContext(ctx).
			Model(&models.Document{}).
			Where("event_id = ? AND user_detail_id IN ?", ev.ID, targetIDs).
			Updates(map[string]any{"updated_at": time.Now()})
		if res.Error != nil {
			return res.Error
		}
		updated = int(res.RowsAffected)
		return nil
	})
	if err != nil {
		return nil, 0, 0, 0, err
	}

	// 3) document_templates.id -> file_id (FileServer)
	type trow struct {
		ID     uuid.UUID
		FileID uuid.UUID
	}
	var tr trow
	if err := s.db.WithContext(ctx).
		Table("document_templates").
		Select("id, file_id").
		Where("id = ?", tplID).
		Scan(&tr).Error; err != nil {
		return nil, created, skipped, updated, err
	}

	// 4) traer docs para payload
	var docs []models.Document
	if err := s.db.WithContext(ctx).
		Select("id", "user_detail_id", "verification_code").
		Where("event_id = ? AND user_detail_id IN ? AND template_id = ?", ev.ID, targetIDs, tplID).
		Find(&docs).Error; err != nil {
		return nil, created, skipped, updated, err
	}

	// 4.1) cargar template_fields una sola vez (document_template_fields)
	templateFields, err := s.templateFieldRepo.GetByTemplateID(ctx, tplID)
	if err != nil {
		return nil, created, skipped, updated, err
	}

	// 4.2) cargar user_details (para resolver nombre_participante, etc.)
	userMap, err := s.userDetailRepo.GetByIDs(ctx, targetIDs)
	if err != nil {
		return nil, created, skipped, updated, err
	}

	// 5) construir job rust
	baseURL := "https://regionayacucho.gob.pe/verify"

	// qr_pdf por defecto + rect si viene
	qrPdf := []map[string]any{
		{"qr_size_cm": "2.5"},
		{"qr_margin_y_cm": "1.0"},
		{"qr_margin_x_cm": "1.0"},
		{"qr_page": "0"},
	}

	// default rect si no viene del request
	rect := "460,40,540,120"
	if qrRect != nil && strings.TrimSpace(*qrRect) != "" {
		qrPdf = append(qrPdf, map[string]any{"qr_rect": strings.TrimSpace(*qrRect)})
	}
	qrPdf = append(qrPdf, map[string]any{"qr_rect": rect})

	job := dto.RustDocsGenerateJob{
		JobID:   uuid.New(),
		JobType: dto.RustJobTypeGenerateDocs,
		EventID: ev.ID,
		Items:   make([]dto.RustDocsJobItem, 0, len(docs)),
	}

	for _, d := range docs {
		participant, ok := userMap[d.UserDetailID]
		if !ok {
			// si no encontramos el user, igual construimos pdf con vacíos (no rompemos)
			participant = models.UserDetail{}
		}

		pdfFields := BuildPdfFields(templateFields, participant, ev)

		job.Items = append(job.Items, dto.RustDocsJobItem{
			ClientRef: d.ID,
			Template:  tr.FileID, // file_id (FileServer)
			UserID:    d.UserDetailID,
			IsPublic:  true,
			QR: []map[string]any{
				{"base_url": baseURL},
				{"verify_code": d.VerificationCode},
			},
			QRPdf: qrPdf,

			// ✅ YA NO hardcode: viene de template_fields + resolver
			PDF: pdfFields,
		})
	}

	cfg := config.GetConfig()
	if err := s.queueRepo.EnqueueGenerateDocs(ctx, job, cfg.REDISJobTTLSeconds); err != nil {
		return nil, created, skipped, updated, err
	}

	// 6) marcar docs con PDF_QUEUED + pdf_job_id
	docIDs := make([]uuid.UUID, 0, len(job.Items))
	for _, it := range job.Items {
		docIDs = append(docIDs, it.ClientRef)
	}
	now := time.Now()
	_ = s.db.WithContext(ctx).Model(&models.Document{}).
		Where("id IN ?", docIDs).
		Updates(map[string]any{
			"status":     "PDF_QUEUED",
			"pdf_job_id": job.JobID,
			"updated_at": now,
		}).Error

	logger.Log.Info().
		Str("job_id", job.JobID.String()).
		Int("total", len(job.Items)).
		Msg("queued docs job from /event/:id")

	jid := job.JobID.String()
	return &jid, created, skipped, updated, nil
}
