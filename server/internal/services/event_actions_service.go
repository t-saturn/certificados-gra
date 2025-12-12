package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type EventActionService interface {
	RunEventAction(ctx context.Context, eventID uuid.UUID, action string, participantIDs []uuid.UUID) (created int, skipped int, updated int, err error)
}

type eventActionServiceImpl struct {
	db *gorm.DB
}

func NewEventActionService(db *gorm.DB) EventActionService {
	return &eventActionServiceImpl{db: db}
}

func normalizeAction(s string) string {
	return strings.TrimSpace(strings.ToLower(s))
}

func buildDraftDocument(ev models.Event, userDetailID uuid.UUID, templateID uuid.UUID, serial, verification string) models.Document {
	now := time.Now()

	return models.Document{
		ID:                     uuid.New(),
		UserDetailID:           userDetailID,
		EventID:                &ev.ID,
		TemplateID:             &templateID,
		SerialCode:             serial,
		VerificationCode:       verification,
		HashValue:              "PENDING_HASH", // si quieres, luego lo recalculas cuando generas PDF
		IssueDate:              now,
		SignedAt:               nil,
		DigitalSignatureStatus: "PENDING",
		Status:                 "CREATED",
		CreatedBy:              ev.CreatedBy,
		CreatedAt:              now,
		UpdatedAt:              now,
	}
}

// si participantIDs vacío => todos los del evento
// si viene => se filtra a los que pertenezcan al evento
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

	// filtrar/unique
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

// -------- helpers --------

func pickSeries(ev models.Event) string {
	// Tu ejemplo usa "CERT". En tu modelo ya existe Event.CertificateSeries.
	series := strings.TrimSpace(ev.CertificateSeries)
	if series == "" {
		series = "CERT"
	}
	return series
}

func makeSerial(evCode, series string, n int) string {
	// EVT-2025-OTIC-0008-CERT-000001
	return fmt.Sprintf("%s-%s-%06d", evCode, series, n)
}

const verAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func newVerificationCode() (string, error) {
	// VER-XXX-XXX (6 chars)
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	out := make([]byte, 6)
	for i := 0; i < 6; i++ {
		out[i] = verAlphabet[int(b[i])%len(verAlphabet)]
	}
	return fmt.Sprintf("VER-%s-%s", string(out[:3]), string(out[3:])), nil
}

func isDuplicateErr(err error) bool {
	// gorm suele mapear duplicados a ErrDuplicatedKey (según driver/version),
	// si no, caemos a string match.
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint")
}

// Obtiene el siguiente correlativo (max + 1) para (event_code + series)
// sin tablas extra, con query al serial_code existente.
func getNextSerialCounter(ctx context.Context, tx *gorm.DB, evCode, series string) (int, error) {
	prefix := fmt.Sprintf("%s-%s-", evCode, series) // EVT-...-CERT-
	var maxN int64

	// Tomamos el sufijo numérico de los últimos 6 chars y lo maximizamos.
	// Si no hay rows, maxN queda 0.
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

// 1) generate_certificates: create missing (CREATED) + set GENERATED
func (s *eventActionServiceImpl) GenerateCertificates(ctx context.Context, tx *gorm.DB, ev models.Event, participantIDs []uuid.UUID) (created int, skipped int, updated int, err error) {
	if ev.TemplateID == nil {
		return 0, 0, 0, fmt.Errorf("event has no template_id; cannot generate certificates")
	}
	tplID := *ev.TemplateID
	series := pickSeries(ev)

	// (A) Bloquear el evento para evitar carreras en correlativo
	// Re-lee el evento con FOR UPDATE dentro del tx
	if err = tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&models.Event{}, "id = ?", ev.ID).Error; err != nil {
		return 0, 0, 0, err
	}

	// (B) Obtener el correlativo inicial (max+1)
	nextN, err := getNextSerialCounter(ctx, tx, ev.Code, series)
	if err != nil {
		return 0, 0, 0, err
	}

	// (C) Crear faltantes con correlativo consecutivo
	for _, udID := range participantIDs {
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
			return 0, 0, 0, findErr
		}

		serial := makeSerial(ev.Code, series, nextN)
		nextN++

		// verification_code único: reintento si colisiona (muy raro, pero posible)
		var lastErr error
		for attempt := 0; attempt < 10; attempt++ {
			ver, verr := newVerificationCode()
			if verr != nil {
				return 0, 0, 0, verr
			}

			doc := buildDraftDocument(ev, udID, tplID, serial, ver)

			// IMPORTANTE: hash_value es NOT NULL en tu modelo.
			// Si no quieres "PENDING_HASH", puedes hacerlo determinista:
			// doc.HashValue = sha256(serial + "|" + ver + "|" + timestamp) ...
			doc.HashValue = fmt.Sprintf("HASH-%s-%s", serial, ver)

			if err := tx.WithContext(ctx).Create(&doc).Error; err != nil {
				lastErr = err
				if isDuplicateErr(err) {
					// si choca verification_code, reintenta con otro.
					// si choca serial_code, algo corrió en paralelo: con FOR UPDATE no debería ocurrir.
					continue
				}
				return 0, 0, 0, err
			}

			created++
			lastErr = nil
			break
		}

		if lastErr != nil {
			return 0, 0, 0, fmt.Errorf("could not create document after retries: %w", lastErr)
		}
	}

	// (D) Set GENERATED solo para ese grupo (manteniendo tu lógica)
	res := tx.WithContext(ctx).
		Model(&models.Document{}).
		Where("event_id = ? AND user_detail_id IN ?", ev.ID, participantIDs).
		Where("status IN ?", []string{"CREATED", "GENERATED"}).
		Updates(map[string]any{
			"status":     "GENERATED",
			"updated_at": time.Now(),
		})

	if res.Error != nil {
		return created, skipped, 0, res.Error
	}
	updated = int(res.RowsAffected)

	return created, skipped, updated, nil
}

// 2) sign_certificates (por ahora): marcar firmado
func (s *eventActionServiceImpl) SignCertificates(ctx context.Context, tx *gorm.DB, ev models.Event, participantIDs []uuid.UUID) (updated int, err error) {
	now := time.Now()

	res := tx.WithContext(ctx).
		Model(&models.Document{}).
		Where("event_id = ? AND user_detail_id IN ?", ev.ID, participantIDs).
		// normalmente solo firmar lo generado:
		Where("status IN ?", []string{"GENERATED", "ISSUED"}).
		Updates(map[string]any{
			"digital_signature_status": "SIGNED",
			"signed_at":                &now,
			"updated_at":               now,
		})

	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

// 3) rejected_certificates: status=REJECTED
func (s *eventActionServiceImpl) RejectCertificates(ctx context.Context, tx *gorm.DB, ev models.Event, participantIDs []uuid.UUID) (updated int, err error) {
	now := time.Now()

	res := tx.WithContext(ctx).
		Model(&models.Document{}).
		Where("event_id = ? AND user_detail_id IN ?", ev.ID, participantIDs).
		// evita tocar algunos finales si quieres:
		Where("status NOT IN ?", []string{"ANNULLED", "REPLACED"}).
		Updates(map[string]any{
			"status":     "REJECTED",
			"updated_at": now,
		})

	if res.Error != nil {
		return 0, res.Error
	}
	return int(res.RowsAffected), nil
}

func (s *eventActionServiceImpl) RunEventAction(ctx context.Context, eventID uuid.UUID, action string, participantIDs []uuid.UUID) (int, int, int, error) {
	act := normalizeAction(action)
	if act != "generate_certificates" && act != "sign_certificates" && act != "rejected_certificates" {
		return 0, 0, 0, fmt.Errorf("invalid action")
	}

	var ev models.Event
	if err := s.db.WithContext(ctx).
		Preload("EventParticipants").
		First(&ev, "id = ?", eventID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, 0, 0, fmt.Errorf("event not found")
		}
		return 0, 0, 0, err
	}

	targetIDs := resolveParticipantIDs(ev, participantIDs)
	if len(targetIDs) == 0 {
		return 0, 0, 0, fmt.Errorf("no valid participants for this event")
	}

	created := 0
	skipped := 0
	updated := 0

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		switch act {
		case "generate_certificates":
			c, s2, u, err := s.GenerateCertificates(ctx, tx, ev, targetIDs)
			if err != nil {
				return err
			}
			created, skipped, updated = c, s2, u
			return nil

		case "sign_certificates":
			u, err := s.SignCertificates(ctx, tx, ev, targetIDs)
			if err != nil {
				return err
			}
			updated = u
			return nil

		case "rejected_certificates":
			u, err := s.RejectCertificates(ctx, tx, ev, targetIDs)
			if err != nil {
				return err
			}
			updated = u
			return nil
		}

		return nil
	})

	if err != nil {
		return 0, 0, 0, err
	}

	return created, skipped, updated, nil
}
