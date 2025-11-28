package services

import (
	"context"
	"errors"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventService interface {
	// createdBy = usuario autenticado (organizador/admin)
	// Devuelve: ID del evento, título del evento
	CreateEvent(ctx context.Context, createdBy uuid.UUID, in dto.CreateEventRequest) (uuid.UUID, string, error)
}

type eventServiceImpl struct {
	db   *gorm.DB
	noti NotificationService
}

func NewEventService(db *gorm.DB, noti NotificationService) EventService {
	return &eventServiceImpl{
		db:   db,
		noti: noti,
	}
}

func (s *eventServiceImpl) CreateEvent(ctx context.Context, createdBy uuid.UUID, in dto.CreateEventRequest) (uuid.UUID, string, error) {
	now := time.Now().UTC()

	var createdEvent *models.Event

	// para notificar luego de la transacción
	participantUserIDs := make(map[uuid.UUID]struct{})

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Validar DocumentType
		var docType models.DocumentType
		if err := tx.Where("id = ? AND is_active = TRUE", in.DocumentTypeID).
			First(&docType).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("document_type not found or inactive")
			}
			return err
		}

		// 2) Si viene TemplateID, validarla y que coincida el tipo
		if in.TemplateID != nil {
			var template models.DocumentTemplate
			if err := tx.Where("id = ? AND is_active = TRUE", *in.TemplateID).
				First(&template).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("template not found or inactive")
				}
				return err
			}

			if template.DocumentTypeID != in.DocumentTypeID {
				return errors.New("template document_type does not match event document_type")
			}
		}

		// 3) Crear el evento (escenario 1, 2, 3)
		status := "SCHEDULED"
		if in.Status != nil && *in.Status != "" {
			status = *in.Status
		}

		event := &models.Event{
			Title:               in.Title,
			Description:         in.Description,
			DocumentTypeID:      in.DocumentTypeID,
			TemplateID:          in.TemplateID,
			Location:            in.Location,
			MaxParticipants:     in.MaxParticipants,
			RegistrationOpenAt:  in.RegistrationOpenAt,
			RegistrationCloseAt: in.RegistrationCloseAt,
			Status:              status,
			CreatedBy:           createdBy,
			CreatedAt:           now,
			UpdatedAt:           now,
		}

		if err := tx.Create(event).Error; err != nil {
			return err
		}

		// 4) Si NO hay participantes → solo se crea el evento (escenarios 1 y 2)
		if len(in.Participants) == 0 {
			createdEvent = event
			return nil
		}

		// 5) Hay participantes → escenario 3
		for _, p := range in.Participants {
			if p.NationalID == "" {
				return errors.New("participant.national_id is required")
			}

			// Aseguramos UserDetail por DNI
			var userDetail models.UserDetail
			err := tx.
				Where("national_id = ?", p.NationalID).
				First(&userDetail).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Crear nuevo UserDetail
				if p.FirstName == "" || p.LastName == "" {
					return errors.New("first_name and last_name are required for new participants")
				}

				userDetail = models.UserDetail{
					NationalID: p.NationalID,
					FirstName:  p.FirstName,
					LastName:   p.LastName,
					Phone:      p.Phone,
					Email:      p.Email,
					CreatedAt:  now,
					UpdatedAt:  now,
				}

				if err = tx.Create(&userDetail).Error; err != nil {
					return err
				}
			} else if err != nil {
				return err
			}

			// Valores por defecto de estados
			regStatus := "REGISTERED"
			if p.RegistrationStatus != nil && *p.RegistrationStatus != "" {
				regStatus = *p.RegistrationStatus
			}

			attStatus := "PENDING"
			if p.AttendanceStatus != nil && *p.AttendanceStatus != "" {
				attStatus = *p.AttendanceStatus
			}

			// Crear EventParticipant, evitando duplicados (índice único EventID + UserDetailID)
			participant := &models.EventParticipant{
				EventID:            event.ID,
				UserDetailID:       userDetail.ID,
				RegistrationSource: p.RegistrationSource,
				RegistrationStatus: regStatus,
				AttendanceStatus:   attStatus,
				CreatedAt:          now,
				UpdatedAt:          now,
			}

			if err := tx.
				Where("event_id = ? AND user_detail_id = ?", event.ID, userDetail.ID).
				FirstOrCreate(participant).Error; err != nil {
				return err
			}

			// Buscar si este participante tiene cuenta (User) por DNI para notificar luego
			var user models.User
			if err := tx.
				Where("national_id = ?", p.NationalID).
				First(&user).Error; err == nil {
				participantUserIDs[user.ID] = struct{}{}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		createdEvent = event
		return nil
	})

	if err != nil {
		return uuid.Nil, "", err
	}

	// --- NOTIFICACIONES (fuera de la transacción) ---

	// 1) Notificar al organizador
	if s.noti != nil {
		_ = s.noti.NotifyUser(
			ctx,
			createdBy,
			"Nuevo evento creado",
			"Has creado el evento: "+createdEvent.Title,
			ptrString("EVENT"),
		)
	}

	// 2) Notificar a participantes que tienen cuenta
	if s.noti != nil {
		for uid := range participantUserIDs {
			_ = s.noti.NotifyUser(
				ctx,
				uid,
				"Inscripción a evento",
				"Has sido inscrito al evento: "+createdEvent.Title,
				ptrString("EVENT"),
			)
		}
	}

	// 👉 Solo devolvemos lo que quieres usar en el handler
	return createdEvent.ID, createdEvent.Title, nil
}

// helper para no repetir &"texto"
func ptrString(s string) *string {
	return &s
}
