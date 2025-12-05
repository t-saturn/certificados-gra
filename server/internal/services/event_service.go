package services

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventService interface {
	CreateEvent(ctx context.Context, userID uuid.UUID, in dto.EventCreateRequest) error
	ListEvents(ctx context.Context, params dto.EventListQuery) (*dto.EventListResponse, error)
	GetEventByID(ctx context.Context, id uuid.UUID) (*dto.EventDetailResponse, error)
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

// -------- ListEvents --------

func (s *eventServiceImpl) ListEvents(ctx context.Context, params dto.EventListQuery) (*dto.EventListResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	db := s.db.WithContext(ctx).
		Model(&models.Event{}).
		Preload("Template").
		Preload("Template.DocumentType")

	// search_query: título
	if params.SearchQuery != nil && strings.TrimSpace(*params.SearchQuery) != "" {
		q := "%" + strings.TrimSpace(*params.SearchQuery) + "%"
		db = db.Where("events.title ILIKE ?", q)
	}

	// status
	if params.Status != nil && strings.TrimSpace(*params.Status) != "" {
		status := strings.TrimSpace(*params.Status)
		db = db.Where("events.status = ?", status)
	}

	// template_id
	if params.TemplateID != nil && strings.TrimSpace(*params.TemplateID) != "" {
		tidStr := strings.TrimSpace(*params.TemplateID)
		if tid, err := uuid.Parse(tidStr); err == nil {
			db = db.Where("events.template_id = ?", tid)
		}
	}

	// document_type_code + is_template_active: join con template y tipo
	joinedTemplate := false

	if params.DocumentTypeCode != nil && strings.TrimSpace(*params.DocumentTypeCode) != "" {
		joinedTemplate = true
		docTypeCode := strings.TrimSpace(*params.DocumentTypeCode)
		db = db.Joins(`
			JOIN document_templates dtpl ON dtpl.id = events.template_id
			JOIN document_types dt ON dt.id = dtpl.document_type_id`,
		).Where("dt.code = ?", docTypeCode)
	}

	if params.IsTemplateActive != nil {
		if !joinedTemplate {
			db = db.Joins(`JOIN document_templates dtpl ON dtpl.id = events.template_id`)
			joinedTemplate = true
		}
		db = db.Where("dtpl.is_active = ?", *params.IsTemplateActive)
	}

	// filtros de fecha sobre created_at (YYYY-MM-DD)
	if params.CreatedDateFromStr != nil && strings.TrimSpace(*params.CreatedDateFromStr) != "" {
		fromStr := strings.TrimSpace(*params.CreatedDateFromStr)
		if from, err := time.Parse("2006-01-02", fromStr); err == nil {
			db = db.Where("events.created_at >= ?", from)
		}
	}
	if params.CreatedDateToStr != nil && strings.TrimSpace(*params.CreatedDateToStr) != "" {
		toStr := strings.TrimSpace(*params.CreatedDateToStr)
		if to, err := time.Parse("2006-01-02", toStr); err == nil {
			// < día siguiente
			db = db.Where("events.created_at < ?", to.Add(24*time.Hour))
		}
	}

	// count
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("error counting events: %w", err)
	}

	if total == 0 {
		return &dto.EventListResponse{
			Items: []dto.EventListItem{},
			Pagination: dto.EventListPagination{
				Page:        page,
				PageSize:    pageSize,
				TotalItems:  0,
				TotalPages:  0,
				HasPrevPage: page > 1,
				HasNextPage: false,
			},
			Filters: dto.EventListFilters{
				SearchQuery:      params.SearchQuery,
				Status:           params.Status,
				TemplateID:       params.TemplateID,
				DocumentTypeCode: params.DocumentTypeCode,
				IsTemplateActive: params.IsTemplateActive,
				CreatedDateFrom:  params.CreatedDateFromStr,
				CreatedDateTo:    params.CreatedDateToStr,
			},
		}, nil
	}

	offset := (page - 1) * pageSize

	var events []models.Event
	if err := db.
		Order("events.created_at DESC, events.id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&events).Error; err != nil {
		return nil, fmt.Errorf("error listing events: %w", err)
	}

	items := make([]dto.EventListItem, 0, len(events))
	for _, ev := range events {
		item := dto.EventListItem{
			ID:                      ev.ID,
			Code:                    ev.Code,
			Title:                   ev.Title,
			Status:                  ev.Status,
			IsPublic:                ev.IsPublic,
			CertificateSeries:       ev.CertificateSeries,
			OrganizationalUnitsPath: ev.OrganizationalUnitsPath,
			Location:                ev.Location,
			MaxParticipants:         ev.MaxParticipants,
			CreatedAt:               ev.CreatedAt.Format(time.RFC3339),
			UpdatedAt:               ev.UpdatedAt.Format(time.RFC3339),
		}

		if ev.RegistrationOpenAt != nil {
			s := ev.RegistrationOpenAt.Format(time.RFC3339)
			item.RegistrationOpenAt = &s
		}
		if ev.RegistrationCloseAt != nil {
			s := ev.RegistrationCloseAt.Format(time.RFC3339)
			item.RegistrationCloseAt = &s
		}

		if ev.Template != nil {
			item.TemplateID = &ev.Template.ID
			item.TemplateCode = &ev.Template.Code
			item.TemplateName = &ev.Template.Name
			if ev.Template.DocumentTypeID != uuid.Nil {
				item.DocumentTypeID = &ev.Template.DocumentTypeID
			}
			if ev.Template.DocumentType.ID != uuid.Nil {
				item.DocumentTypeID = &ev.Template.DocumentType.ID
				item.DocumentTypeCode = &ev.Template.DocumentType.Code
				item.DocumentTypeName = &ev.Template.DocumentType.Name
			}
		}

		items = append(items, item)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	hasNext := page < totalPages
	hasPrev := page > 1

	resp := &dto.EventListResponse{
		Items: items,
		Pagination: dto.EventListPagination{
			Page:        page,
			PageSize:    pageSize,
			TotalItems:  int(total),
			TotalPages:  totalPages,
			HasPrevPage: hasPrev,
			HasNextPage: hasNext,
		},
		Filters: dto.EventListFilters{
			SearchQuery:      params.SearchQuery,
			Status:           params.Status,
			TemplateID:       params.TemplateID,
			DocumentTypeCode: params.DocumentTypeCode,
			IsTemplateActive: params.IsTemplateActive,
			CreatedDateFrom:  params.CreatedDateFromStr,
			CreatedDateTo:    params.CreatedDateToStr,
		},
	}

	return resp, nil
}

// -------- GetEventByID (detalle completo) --------

// -------- GetEventByID (detalle completo) --------

func (s *eventServiceImpl) GetEventByID(ctx context.Context, id uuid.UUID) (*dto.EventDetailResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var ev models.Event
	if err := s.db.WithContext(ctx).
		Preload("Template").
		Preload("Template.DocumentType").
		Preload("Schedules").
		Preload("EventParticipants").
		Preload("EventParticipants.UserDetail").
		Preload("Documents").
		Preload("Documents.Template").
		Preload("Documents.Template.DocumentType").
		First(&ev, "id = ?", id).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("event not found")
		}
		return nil, fmt.Errorf("error fetching event: %w", err)
	}

	resp := dto.EventDetailResponse{
		ID:                      ev.ID,
		IsPublic:                ev.IsPublic,
		Code:                    ev.Code,
		CertificateSeries:       ev.CertificateSeries,
		OrganizationalUnitsPath: ev.OrganizationalUnitsPath,
		Title:                   ev.Title,
		Description:             ev.Description,
		Location:                ev.Location,
		MaxParticipants:         ev.MaxParticipants,
		RegistrationOpenAt:      ev.RegistrationOpenAt,
		RegistrationCloseAt:     ev.RegistrationCloseAt,
		Status:                  ev.Status,
		CreatedBy:               ev.CreatedBy,
		CreatedAt:               ev.CreatedAt,
		UpdatedAt:               ev.UpdatedAt,
	}

	if ev.Template != nil {
		resp.Template = &dto.EventDetailTemplateInfo{
			ID:               ev.Template.ID,
			Code:             ev.Template.Code,
			Name:             ev.Template.Name,
			IsActive:         ev.Template.IsActive,
			DocumentTypeID:   ev.Template.DocumentTypeID,
			DocumentTypeCode: ev.Template.DocumentType.Code,
			DocumentTypeName: ev.Template.DocumentType.Name,
		}
	}

	for _, s := range ev.Schedules {
		resp.Schedules = append(resp.Schedules, dto.EventDetailScheduleItem{
			ID:            s.ID,
			StartDatetime: s.StartDatetime,
			EndDatetime:   s.EndDatetime,
		})
	}

	for _, p := range ev.EventParticipants {
		pi := dto.EventDetailParticipantItem{
			ID:                 p.ID,
			UserDetailID:       p.UserDetailID,
			RegistrationSource: p.RegistrationSource,
			RegistrationStatus: p.RegistrationStatus,
			AttendanceStatus:   p.AttendanceStatus,
			CreatedAt:          p.CreatedAt,
			UpdatedAt:          p.UpdatedAt,
		}
		if p.UserDetail.ID != uuid.Nil {
			pi.NationalID = p.UserDetail.NationalID
			pi.FirstName = p.UserDetail.FirstName
			pi.LastName = p.UserDetail.LastName
			pi.Phone = p.UserDetail.Phone
			pi.Email = p.UserDetail.Email
		}
		resp.Participants = append(resp.Participants, pi)
	}

	for _, d := range ev.Documents {
		di := dto.EventDetailDocumentItem{
			ID:               d.ID,
			UserDetailID:     d.UserDetailID,
			SerialCode:       d.SerialCode,
			VerificationCode: d.VerificationCode,
			Status:           d.Status,
			IssueDate:        d.IssueDate,
			TemplateID:       d.TemplateID,
			// DocumentTypeID lo sacamos del template si existe
		}

		if d.Template != nil {
			// ID del tipo
			di.DocumentTypeID = d.Template.DocumentTypeID

			// Código y nombre del tipo (si el preload trajo el DocumentType)
			if d.Template.DocumentType.ID != uuid.Nil {
				di.DocumentTypeCode = d.Template.DocumentType.Code
				di.DocumentTypeName = d.Template.DocumentType.Name
			}
		}

		resp.Documents = append(resp.Documents, di)
	}

	return &resp, nil
}
