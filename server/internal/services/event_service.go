package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventService interface {
	CreateEvent(ctx context.Context, userID uuid.UUID, in dto.EventCreateRequest) error
}

type eventServiceImpl struct {
	db *gorm.DB
}

func NewEventService(db *gorm.DB) EventService {
	return &eventServiceImpl{db: db}
}

func (s *eventServiceImpl) CreateEvent(ctx context.Context, userID uuid.UUID, in dto.EventCreateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// Normalizar / defaults
	code := strings.TrimSpace(in.Code)
	if code == "" {
		return fmt.Errorf("event code is required")
	}

	certSeries := strings.TrimSpace(in.CertificateSeries)
	if certSeries == "" {
		return fmt.Errorf("certificate_series is required")
	}

	orgPath := strings.TrimSpace(in.OrganizationalUnitsPath)
	if orgPath == "" {
		return fmt.Errorf("organizational_units_path is required")
	}

	title := strings.TrimSpace(in.Title)
	if title == "" {
		return fmt.Errorf("title is required")
	}

	location := strings.TrimSpace(in.Location)
	if location == "" {
		return fmt.Errorf("location is required")
	}

	if len(in.Schedules) == 0 {
		return fmt.Errorf("at least one schedule is required")
	}

	// Validar schedule dates básicos
	for i, sch := range in.Schedules {
		if sch.StartDatetime.IsZero() || sch.EndDatetime.IsZero() {
			return fmt.Errorf("schedule %d has invalid datetime", i)
		}
		if !sch.EndDatetime.After(sch.StartDatetime) {
			return fmt.Errorf("schedule %d end_datetime must be after start_datetime", i)
		}
	}

	// Parsear TemplateID (si viene)
	var templateID *uuid.UUID
	if in.TemplateID != nil && strings.TrimSpace(*in.TemplateID) != "" {
		tid, err := uuid.Parse(strings.TrimSpace(*in.TemplateID))
		if err != nil {
			return fmt.Errorf("invalid template_id")
		}
		templateID = &tid
	}

	// Parsear participantes
	participants := make([]models.EventParticipant, 0, len(in.Participants))
	for idx, p := range in.Participants {
		userDetailStr := strings.TrimSpace(p.UserDetailID)
		if userDetailStr == "" {
			return fmt.Errorf("participant %d has empty user_detail_id", idx)
		}

		udID, err := uuid.Parse(userDetailStr)
		if err != nil {
			return fmt.Errorf("participant %d has invalid user_detail_id", idx)
		}

		var regSource *string
		if p.RegistrationSource != nil {
			trimmed := strings.TrimSpace(*p.RegistrationSource)
			if trimmed != "" {
				regSource = &trimmed
			}
		}

		participants = append(participants, models.EventParticipant{
			ID:                 uuid.New(),
			EventID:            uuid.Nil, // se setea después de crear el evento
			UserDetailID:       udID,
			RegistrationSource: regSource,
			RegistrationStatus: "REGISTERED",
			AttendanceStatus:   "PENDING",
			CreatedAt:          time.Now().UTC(),
			UpdatedAt:          time.Now().UTC(),
		})
	}

	isPublic := true
	if in.IsPublic != nil {
		isPublic = *in.IsPublic
	}

	status := "SCHEDULED"
	if in.Status != nil && strings.TrimSpace(*in.Status) != "" {
		status = strings.TrimSpace(*in.Status)
	}

	now := time.Now().UTC()

	event := models.Event{
		ID:                      uuid.New(),
		IsPublic:                isPublic,
		Code:                    code,
		CertificateSeries:       certSeries,
		OrganizationalUnitsPath: orgPath,
		Title:                   title,
		Description:             in.Description,
		TemplateID:              templateID,
		Location:                location,
		MaxParticipants:         in.MaxParticipants,
		RegistrationOpenAt:      in.RegistrationOpenAt,
		RegistrationCloseAt:     in.RegistrationCloseAt,
		Status:                  status,
		CreatedBy:               userID,
		CreatedAt:               now,
		UpdatedAt:               now,
	}

	// Transaction: Event + Schedules + Participants
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Asegurar unicidad del code
		var existing models.Event
		if err := tx.Where("code = ?", code).First(&existing).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("error checking existing event code: %w", err)
			}
		} else {
			return fmt.Errorf("event with code '%s' already exists", code)
		}

		// Crear evento
		if err := tx.Create(&event).Error; err != nil {
			return fmt.Errorf("error creating event: %w", err)
		}

		// Crear schedules
		for _, schReq := range in.Schedules {
			sch := models.EventSchedule{
				ID:            uuid.New(),
				EventID:       event.ID,
				StartDatetime: schReq.StartDatetime,
				EndDatetime:   schReq.EndDatetime,
				CreatedAt:     now,
			}
			if err := tx.Create(&sch).Error; err != nil {
				return fmt.Errorf("error creating event schedule: %w", err)
			}
		}

		// Crear participantes opcionales
		for i := range participants {
			participants[i].EventID = event.ID
			if err := tx.Create(&participants[i]).Error; err != nil {
				return fmt.Errorf("error creating event participant: %w", err)
			}
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}
