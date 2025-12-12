package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventActionService interface {
	RunEventAction(ctx context.Context, eventID uuid.UUID, action string) (created int, skipped int, updated int, err error)
}

type eventActionServiceImpl struct {
	db *gorm.DB
}

func NewEventActionService(db *gorm.DB) EventActionService {
	return &eventActionServiceImpl{db: db}
}

func (s *eventActionServiceImpl) RunEventAction(ctx context.Context, eventID uuid.UUID, action string) (int, int, int, error) {
	act := strings.TrimSpace(strings.ToLower(action))
	if act != "create_certificates" && act != "generate_certificates" {
		return 0, 0, 0, fmt.Errorf("invalid action")
	}

	// Cargar evento + participantes (y user_detail)
	var ev models.Event
	if err := s.db.WithContext(ctx).
		Preload("EventParticipants").
		Preload("EventParticipants.UserDetail").
		First(&ev, "id = ?", eventID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, 0, 0, fmt.Errorf("event not found")
		}
		return 0, 0, 0, err
	}

	// Para certificados normalmente necesitas template. Si tu flujo permite "sin template", quita este check.
	if ev.TemplateID == nil {
		return 0, 0, 0, fmt.Errorf("event has no template_id; cannot create certificates")
	}

	created := 0
	skipped := 0
	updated := 0

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		switch act {

		case "create_certificates":
			for _, ep := range ev.EventParticipants {
				udID := ep.UserDetailID
				tplID := *ev.TemplateID

				// Idempotencia: si ya existe doc para (event_id, user_detail_id, template_id) -> no hacer nada
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

				// Crear documento "CREATED" con mínimos requeridos
				now := time.Now()
				newID := uuid.New()

				// serial_code y verification_code deben ser únicos y NOT NULL
				serial := fmt.Sprintf("CREATED-%s-%s", ev.Code, newID.String())
				verification := fmt.Sprintf("VER-%s", uuid.NewString())

				// hash_value NOT NULL
				sum := sha256.Sum256([]byte(newID.String() + "|" + verification + "|" + now.Format(time.RFC3339Nano)))
				hashValue := hex.EncodeToString(sum[:])

				doc := models.Document{
					ID:                     newID,
					UserDetailID:           udID,
					EventID:                &ev.ID,
					TemplateID:             &tplID,
					SerialCode:             serial,
					VerificationCode:       verification,
					HashValue:              hashValue,
					IssueDate:              now,
					SignedAt:               nil,
					DigitalSignatureStatus: "PENDING",
					Status:                 "CREATED",    // <-- lo que pediste
					CreatedBy:              ev.CreatedBy, // organizador / admin del evento
					CreatedAt:              now,
					UpdatedAt:              now,
				}

				if err := tx.WithContext(ctx).Create(&doc).Error; err != nil {
					return err
				}
				created++
			}
			return nil

		case "generate_certificates":
			// Por ahora: solo cambiar estado a GENERATED para docs del evento
			res := tx.WithContext(ctx).
				Model(&models.Document{}).
				Where("event_id = ?", ev.ID).
				Update("status", "GENERATED")

			if res.Error != nil {
				return res.Error
			}
			updated = int(res.RowsAffected)
			return nil
		}

		return nil
	})

	if err != nil {
		return 0, 0, 0, err
	}

	return created, skipped, updated, nil
}
