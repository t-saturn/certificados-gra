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

	// -------- Normalización y validaciones básicas --------

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

	for i, sch := range in.Schedules {
		if sch.StartDatetime.IsZero() || sch.EndDatetime.IsZero() {
			return fmt.Errorf("schedule %d has invalid datetime", i)
		}
		if !sch.EndDatetime.After(sch.StartDatetime) {
			return fmt.Errorf("schedule %d end_datetime must be after start_datetime", i)
		}
	}

	// TemplateID opcional
	var templateID *uuid.UUID
	if in.TemplateID != nil && strings.TrimSpace(*in.TemplateID) != "" {
		tid, err := uuid.Parse(strings.TrimSpace(*in.TemplateID))
		if err != nil {
			return fmt.Errorf("invalid template_id")
		}
		templateID = &tid
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

	// -------- Transacción: Event + Schedules + (UserDetail + Participants) --------

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Unicidad del code
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

		// Participantes: buscar/crear UserDetail por DNI y luego EventParticipant
		for idx, pReq := range in.Participants {
			nationalID := strings.TrimSpace(pReq.NationalID)
			if nationalID == "" {
				return fmt.Errorf("participant %d has empty national_id", idx)
			}

			var userDetail models.UserDetail
			err := tx.Where("national_id = ?", nationalID).First(&userDetail).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					// No existe → debemos crear un UserDetail nuevo
					if pReq.FirstName == nil || strings.TrimSpace(*pReq.FirstName) == "" {
						return fmt.Errorf("participant %d missing first_name for new user_detail", idx)
					}
					if pReq.LastName == nil || strings.TrimSpace(*pReq.LastName) == "" {
						return fmt.Errorf("participant %d missing last_name for new user_detail", idx)
					}

					firstName := strings.TrimSpace(*pReq.FirstName)
					lastName := strings.TrimSpace(*pReq.LastName)

					var phone *string
					if pReq.Phone != nil && strings.TrimSpace(*pReq.Phone) != "" {
						ph := strings.TrimSpace(*pReq.Phone)
						phone = &ph
					}
					var email *string
					if pReq.Email != nil && strings.TrimSpace(*pReq.Email) != "" {
						em := strings.TrimSpace(*pReq.Email)
						email = &em
					}

					userDetail = models.UserDetail{
						ID:         uuid.New(),
						NationalID: nationalID,
						FirstName:  firstName,
						LastName:   lastName,
						Phone:      phone,
						Email:      email,
						CreatedAt:  now,
						UpdatedAt:  now,
					}

					if createErr := tx.Create(&userDetail).Error; createErr != nil {
						return fmt.Errorf("error creating user_detail for participant %d: %w", idx, err)
					}
				} else {
					return fmt.Errorf("error fetching user_detail for participant %d: %w", idx, err)
				}
			}

			// RegistrationSource normalizado
			var regSource *string
			if pReq.RegistrationSource != nil {
				trimmed := strings.TrimSpace(*pReq.RegistrationSource)
				if trimmed != "" {
					regSource = &trimmed
				}
			}

			participant := models.EventParticipant{
				ID:                 uuid.New(),
				EventID:            event.ID,
				UserDetailID:       userDetail.ID,
				RegistrationSource: regSource,
				RegistrationStatus: "REGISTERED",
				AttendanceStatus:   "PENDING",
				CreatedAt:          now,
				UpdatedAt:          now,
			}

			if err := tx.Create(&participant).Error; err != nil {
				return fmt.Errorf("error creating event participant %d: %w", idx, err)
			}
		}

		return nil
	}); err != nil {
		return err
	}

	return nil
}
