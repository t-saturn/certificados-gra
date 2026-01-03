package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/dto"
	"server/internal/repository"
)

// FNEventService defines the interface for event business logic
type FNEventService interface {
	Create(ctx context.Context, userID uuid.UUID, req dto.EventCreateRequest) (*dto.EventResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.EventResponse, error)
	GetByCode(ctx context.Context, code string) (*dto.EventResponse, error)
	List(ctx context.Context, params dto.EventListQuery) ([]dto.EventListItem, int64, error)
	Update(ctx context.Context, id uuid.UUID, req dto.EventUpdateRequest) (*dto.EventResponse, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type fnEventService struct {
	eventRepo      repository.FNEventRepository
	userDetailRepo repository.FNUserDetailRepository
}

// NewFNEventService creates a new FN event service
func NewFNEventService(eventRepo repository.FNEventRepository, userDetailRepo repository.FNUserDetailRepository) FNEventService {
	return &fnEventService{
		eventRepo:      eventRepo,
		userDetailRepo: userDetailRepo,
	}
}

func (s *fnEventService) Create(ctx context.Context, userID uuid.UUID, req dto.EventCreateRequest) (*dto.EventResponse, error) {
	code := strings.TrimSpace(req.Code)
	if code == "" {
		return nil, fmt.Errorf("event code is required")
	}

	exists, err := s.eventRepo.ExistsByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error checking event code: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("event with code '%s' already exists", code)
	}

	now := time.Now().UTC()

	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	status := "SCHEDULED"
	if req.Status != nil && strings.TrimSpace(*req.Status) != "" {
		status = strings.TrimSpace(*req.Status)
	}

	certificateSeries := ""
	if req.CertificateSeries != nil {
		certificateSeries = *req.CertificateSeries
	}

	organizationalUnitsPath := ""
	if req.OrganizationalUnitsPath != nil {
		organizationalUnitsPath = *req.OrganizationalUnitsPath
	}

	var templateID *uuid.UUID
	if req.TemplateID != nil && *req.TemplateID != "" {
		tid, err := uuid.Parse(*req.TemplateID)
		if err != nil {
			return nil, fmt.Errorf("invalid template_id: must be a valid UUID")
		}
		templateID = &tid
	}

	event := &models.Event{
		ID:                      uuid.New(),
		Code:                    code,
		Title:                   strings.TrimSpace(req.Title),
		Description:             req.Description,
		Location:                strings.TrimSpace(req.Location),
		IsPublic:                isPublic,
		CertificateSeries:       certificateSeries,
		OrganizationalUnitsPath: organizationalUnitsPath,
		TemplateID:              templateID,
		MaxParticipants:         req.MaxParticipants,
		RegistrationOpenAt:      req.RegistrationOpenAt,
		RegistrationCloseAt:     req.RegistrationCloseAt,
		Status:                  status,
		CreatedBy:               userID,
		CreatedAt:               now,
		UpdatedAt:               now,
	}

	// build schedules
	var schedules []models.EventSchedule
	for _, sch := range req.Schedules {
		schedules = append(schedules, models.EventSchedule{
			ID:            uuid.New(),
			EventID:       event.ID,
			StartDatetime: sch.StartDatetime,
			EndDatetime:   sch.EndDatetime,
			CreatedAt:     now,
		})
	}

	// build participants - check if user_detail exists by national_id
	var participants []models.EventParticipant
	for _, p := range req.Participants {
		nationalID := strings.TrimSpace(p.NationalID)
		if nationalID == "" {
			return nil, fmt.Errorf("participant national_id is required")
		}

		userDetail, err := s.userDetailRepo.GetByNationalID(ctx, nationalID)
		if err != nil {
			return nil, fmt.Errorf("error checking user detail: %w", err)
		}

		if userDetail == nil {
			userDetail = &models.UserDetail{
				ID:         uuid.New(),
				NationalID: nationalID,
				FirstName:  strings.TrimSpace(p.FirstName),
				LastName:   strings.TrimSpace(p.LastName),
				Email:      p.Email,
				Phone:      p.Phone,
				CreatedAt:  now,
				UpdatedAt:  now,
			}
			if err := s.userDetailRepo.Create(ctx, userDetail); err != nil {
				return nil, fmt.Errorf("error creating user detail: %w", err)
			}
		}

		registrationStatus := "REGISTERED"
		if p.RegistrationStatus != nil && *p.RegistrationStatus != "" {
			registrationStatus = *p.RegistrationStatus
		}

		attendanceStatus := "PENDING"
		if p.AttendanceStatus != nil && *p.AttendanceStatus != "" {
			attendanceStatus = *p.AttendanceStatus
		}

		participants = append(participants, models.EventParticipant{
			ID:                 uuid.New(),
			EventID:            event.ID,
			UserDetailID:       userDetail.ID,
			RegistrationSource: p.RegistrationSource,
			RegistrationStatus: registrationStatus,
			AttendanceStatus:   attendanceStatus,
			CreatedAt:          now,
			UpdatedAt:          now,
		})
	}

	if err := s.eventRepo.Create(ctx, event, schedules, participants); err != nil {
		return nil, fmt.Errorf("error creating event: %w", err)
	}

	created, err := s.eventRepo.GetByID(ctx, event.ID)
	if err != nil {
		return nil, fmt.Errorf("error fetching created event: %w", err)
	}

	return s.toResponse(created), nil
}

func (s *fnEventService) GetByID(ctx context.Context, id uuid.UUID) (*dto.EventResponse, error) {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching event: %w", err)
	}
	if event == nil {
		return nil, nil
	}
	return s.toResponse(event), nil
}

func (s *fnEventService) GetByCode(ctx context.Context, code string) (*dto.EventResponse, error) {
	event, err := s.eventRepo.GetByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error fetching event: %w", err)
	}
	if event == nil {
		return nil, nil
	}
	return s.toResponse(event), nil
}

func (s *fnEventService) List(ctx context.Context, params dto.EventListQuery) ([]dto.EventListItem, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}

	events, total, err := s.eventRepo.List(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("error listing events: %w", err)
	}

	items := make([]dto.EventListItem, 0, len(events))
	for _, e := range events {
		participantsCount, _ := s.eventRepo.CountParticipantsByEventID(ctx, e.ID)
		schedulesCount, _ := s.eventRepo.CountSchedulesByEventID(ctx, e.ID)

		item := dto.EventListItem{
			ID:                  e.ID,
			Code:                e.Code,
			Title:               e.Title,
			Description:         e.Description,
			Location:            e.Location,
			IsPublic:            e.IsPublic,
			Status:              e.Status,
			MaxParticipants:     e.MaxParticipants,
			RegistrationOpenAt:  e.RegistrationOpenAt,
			RegistrationCloseAt: e.RegistrationCloseAt,
			CreatedAt:           e.CreatedAt.Format(time.RFC3339),
			UpdatedAt:           e.UpdatedAt.Format(time.RFC3339),
			ParticipantsCount:   int(participantsCount),
			SchedulesCount:      int(schedulesCount),
		}

		if e.TemplateID != nil {
			item.TemplateID = e.TemplateID
		}
		if e.Template != nil {
			item.TemplateCode = &e.Template.Code
			item.TemplateName = &e.Template.Name
		}

		items = append(items, item)
	}

	return items, total, nil
}

func (s *fnEventService) Update(ctx context.Context, id uuid.UUID, req dto.EventUpdateRequest) (*dto.EventResponse, error) {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching event: %w", err)
	}
	if event == nil {
		return nil, fmt.Errorf("event not found")
	}

	if req.Code != nil {
		code := strings.TrimSpace(*req.Code)
		if code != "" && code != event.Code {
			exists, err := s.eventRepo.ExistsByCodeExcludingID(ctx, code, id)
			if err != nil {
				return nil, fmt.Errorf("error checking code: %w", err)
			}
			if exists {
				return nil, fmt.Errorf("event with code '%s' already exists", code)
			}
			event.Code = code
		}
	}

	if req.Title != nil {
		event.Title = strings.TrimSpace(*req.Title)
	}

	if req.Description != nil {
		event.Description = req.Description
	}

	if req.Location != nil {
		event.Location = strings.TrimSpace(*req.Location)
	}

	if req.IsPublic != nil {
		event.IsPublic = *req.IsPublic
	}

	if req.CertificateSeries != nil {
		event.CertificateSeries = *req.CertificateSeries
	}

	if req.OrganizationalUnitsPath != nil {
		event.OrganizationalUnitsPath = *req.OrganizationalUnitsPath
	}

	if req.TemplateID != nil {
		if *req.TemplateID == "" {
			event.TemplateID = nil
		} else {
			tid, err := uuid.Parse(*req.TemplateID)
			if err != nil {
				return nil, fmt.Errorf("invalid template_id")
			}
			event.TemplateID = &tid
		}
	}

	if req.MaxParticipants != nil {
		event.MaxParticipants = req.MaxParticipants
	}

	if req.RegistrationOpenAt != nil {
		event.RegistrationOpenAt = req.RegistrationOpenAt
	}

	if req.RegistrationCloseAt != nil {
		event.RegistrationCloseAt = req.RegistrationCloseAt
	}

	if req.Status != nil {
		event.Status = strings.TrimSpace(*req.Status)
	}

	event.UpdatedAt = time.Now().UTC()

	if err := s.eventRepo.Update(ctx, event); err != nil {
		return nil, fmt.Errorf("error updating event: %w", err)
	}

	updated, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching updated event: %w", err)
	}

	return s.toResponse(updated), nil
}

func (s *fnEventService) Delete(ctx context.Context, id uuid.UUID) error {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("error fetching event: %w", err)
	}
	if event == nil {
		return fmt.Errorf("event not found")
	}

	return s.eventRepo.Delete(ctx, id)
}

func (s *fnEventService) toResponse(e *models.Event) *dto.EventResponse {
	if e == nil {
		return nil
	}

	resp := &dto.EventResponse{
		ID:                      e.ID,
		Code:                    e.Code,
		Title:                   e.Title,
		Description:             e.Description,
		Location:                e.Location,
		IsPublic:                e.IsPublic,
		CertificateSeries:       e.CertificateSeries,
		OrganizationalUnitsPath: e.OrganizationalUnitsPath,
		MaxParticipants:         e.MaxParticipants,
		RegistrationOpenAt:      e.RegistrationOpenAt,
		RegistrationCloseAt:     e.RegistrationCloseAt,
		Status:                  e.Status,
		CreatedBy:               e.CreatedBy,
		CreatedAt:               e.CreatedAt,
		UpdatedAt:               e.UpdatedAt,
		ParticipantsCount:       len(e.EventParticipants),
	}

	if e.Template != nil {
		resp.Template = &dto.DocumentTemplateEmbedded{
			ID:   e.Template.ID,
			Code: e.Template.Code,
			Name: e.Template.Name,
		}
	}

	if len(e.Schedules) > 0 {
		resp.Schedules = make([]dto.EventScheduleResponse, 0, len(e.Schedules))
		for _, sch := range e.Schedules {
			resp.Schedules = append(resp.Schedules, dto.EventScheduleResponse{
				ID:            sch.ID,
				StartDatetime: sch.StartDatetime,
				EndDatetime:   sch.EndDatetime,
			})
		}
	}

	if len(e.EventParticipants) > 0 {
		resp.Participants = make([]dto.EventParticipantResponse, 0, len(e.EventParticipants))
		for _, p := range e.EventParticipants {
			resp.Participants = append(resp.Participants, dto.EventParticipantResponse{
				ID:                 p.ID,
				RegistrationSource: p.RegistrationSource,
				RegistrationStatus: p.RegistrationStatus,
				AttendanceStatus:   p.AttendanceStatus,
				CreatedAt:          p.CreatedAt,
				UserDetail: dto.UserDetailEmbedded{
					ID:         p.UserDetail.ID,
					NationalID: p.UserDetail.NationalID,
					FirstName:  p.UserDetail.FirstName,
					LastName:   p.UserDetail.LastName,
					Email:      p.UserDetail.Email,
					Phone:      p.UserDetail.Phone,
				},
			})
		}
	}

	return resp
}