package services

import (
	"context"
	"fmt"
	"math"
	"strconv"
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
	UpdateEvent(ctx context.Context, id uuid.UUID, in dto.EventUpdateRequest) error
	UpdateEventParticipants(ctx context.Context, id uuid.UUID, in dto.EventParticipantsUpdateRequest) error
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

	// AHORA in.Code es el "código de oficina" (ej: OTIC)
	officeCode := strings.TrimSpace(in.Code)
	if officeCode == "" {
		return fmt.Errorf("office code is required")
	}
	officeCode = strings.ToUpper(officeCode)

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
	year := now.Year()

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// -------- Generar código EVT-<year>-<office>-0001 --------
		codePrefix := fmt.Sprintf("EVT-%d-%s-", year, officeCode)

		var lastEvent models.Event
		if err := tx.
			Where("code LIKE ?", codePrefix+"%").
			Order("code DESC").
			Limit(1).
			Find(&lastEvent).Error; err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("error getting last event code: %w", err)
		}

		seq := 1
		if lastEvent.ID != uuid.Nil {
			parts := strings.Split(lastEvent.Code, "-")
			if len(parts) >= 4 {
				nStr := parts[len(parts)-1]
				if n, err := strconv.Atoi(nStr); err == nil && n >= seq {
					seq = n + 1
				}
			}
		}

		generatedCode := fmt.Sprintf("%s%04d", codePrefix, seq)

		// Por si acaso, verificación de unicidad del código generado
		var existing models.Event
		if err := tx.Where("code = ?", generatedCode).First(&existing).Error; err != nil {
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("error checking existing event code: %w", err)
			}
		} else {
			return fmt.Errorf("event with code '%s' already exists", generatedCode)
		}

		// -------- Crear evento --------
		event := models.Event{
			ID:                      uuid.New(),
			IsPublic:                isPublic,
			Code:                    generatedCode,
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

		if err := tx.Create(&event).Error; err != nil {
			return fmt.Errorf("error creating event: %w", err)
		}

		// -------- Crear schedules --------
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

		// -------- Participantes --------
		for idx, pReq := range in.Participants {
			nationalID := strings.TrimSpace(pReq.NationalID)
			if nationalID == "" {
				return fmt.Errorf("participant %d has empty national_id", idx)
			}

			var userDetail models.UserDetail
			err := tx.Where("national_id = ?", nationalID).First(&userDetail).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
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
	})
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

	// NUEVO: is_public
	if params.IsPublic != nil {
		db = db.Where("events.is_public = ?", *params.IsPublic)
	}

	// NUEVO: user_id -> created_by
	if params.UserID != nil && strings.TrimSpace(*params.UserID) != "" {
		userIDStr := strings.TrimSpace(*params.UserID)
		if userID, err := uuid.Parse(userIDStr); err == nil {
			db = db.Where("events.created_by = ?", userID)
		}
	}

	// template_id
	if params.TemplateID != nil && strings.TrimSpace(*params.TemplateID) != "" {
		tidStr := strings.TrimSpace(*params.TemplateID)
		if tid, err := uuid.Parse(tidStr); err == nil {
			db = db.Where("events.template_id = ?", tid)
		}
	}

	// document_type_code + is_template_active
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
				IsPublic:         params.IsPublic,
				UserID:           params.UserID,
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
			IsPublic:         params.IsPublic,
			UserID:           params.UserID,
			CreatedDateFrom:  params.CreatedDateFromStr,
			CreatedDateTo:    params.CreatedDateToStr,
		},
	}

	return resp, nil
}

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

func (s *eventServiceImpl) UpdateEvent(ctx context.Context, id uuid.UUID, in dto.EventUpdateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var ev models.Event
		if err := tx.First(&ev, "id = ?", id).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("event not found")
			}
			return fmt.Errorf("error fetching event: %w", err)
		}

		// --- Campos simples (patch con punteros) ---

		if in.IsPublic != nil {
			ev.IsPublic = *in.IsPublic
		}

		if in.CertificateSeries != nil {
			cs := strings.TrimSpace(*in.CertificateSeries)
			ev.CertificateSeries = cs
		}

		if in.OrganizationalUnitsPath != nil {
			org := strings.TrimSpace(*in.OrganizationalUnitsPath)
			ev.OrganizationalUnitsPath = org
		}

		if in.Title != nil {
			title := strings.TrimSpace(*in.Title)
			ev.Title = title
		}

		if in.Description != nil {
			// Aquí permitimos descripción vacía
			desc := strings.TrimSpace(*in.Description)
			// si quieres mantener nil cuando venga "", puedes hacer condicional
			ev.Description = &desc
			if desc == "" {
				// opcional: ev.Description = nil
			}
		}

		if in.Location != nil {
			loc := strings.TrimSpace(*in.Location)
			ev.Location = loc
		}

		if in.MaxParticipants != nil {
			ev.MaxParticipants = in.MaxParticipants
		}

		if in.RegistrationOpenAt != nil {
			ev.RegistrationOpenAt = in.RegistrationOpenAt
		}

		if in.RegistrationCloseAt != nil {
			ev.RegistrationCloseAt = in.RegistrationCloseAt
		}

		if in.Status != nil {
			status := strings.TrimSpace(*in.Status)
			if status != "" {
				ev.Status = status
			}
		}

		// TemplateID: string UUID o "" para limpiar
		if in.TemplateID != nil {
			tidStr := strings.TrimSpace(*in.TemplateID)
			if tidStr == "" {
				ev.TemplateID = nil
			} else {
				tid, err := uuid.Parse(tidStr)
				if err != nil {
					return fmt.Errorf("invalid template_id")
				}
				ev.TemplateID = &tid
			}
		}

		now := time.Now().UTC()
		ev.UpdatedAt = now

		if err := tx.Save(&ev).Error; err != nil {
			return fmt.Errorf("error updating event: %w", err)
		}

		// --- Schedules: si el campo viene en el request, reemplazamos todo ---

		if in.Schedules != nil {
			newSchedules := *in.Schedules

			// Validar
			for i, sch := range newSchedules {
				if sch.StartDatetime.IsZero() || sch.EndDatetime.IsZero() {
					return fmt.Errorf("schedule %d has invalid datetime", i)
				}
				if !sch.EndDatetime.After(sch.StartDatetime) {
					return fmt.Errorf("schedule %d end_datetime must be after start_datetime", i)
				}
			}

			// Borrar los schedules anteriores
			if err := tx.Where("event_id = ?", ev.ID).Delete(&models.EventSchedule{}).Error; err != nil {
				return fmt.Errorf("error deleting old schedules: %w", err)
			}

			// Crear nuevos (si la lista está vacía, simplemente se quedan sin sesiones)
			for _, schReq := range newSchedules {
				sch := models.EventSchedule{
					ID:            uuid.New(),
					EventID:       ev.ID,
					StartDatetime: schReq.StartDatetime,
					EndDatetime:   schReq.EndDatetime,
					CreatedAt:     now,
				}
				if err := tx.Create(&sch).Error; err != nil {
					return fmt.Errorf("error creating event schedule: %w", err)
				}
			}
		}

		return nil
	})
}

func (s *eventServiceImpl) UpdateEventParticipants(ctx context.Context, eventID uuid.UUID, in dto.EventParticipantsUpdateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	if len(in.Participants) == 0 {
		// nada que hacer, pero no es error
		return nil
	}

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Verificar que el evento exista
		var ev models.Event
		if err := tx.First(&ev, "id = ?", eventID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("event not found")
			}
			return fmt.Errorf("error fetching event: %w", err)
		}

		now := time.Now().UTC()

		for idx, pReq := range in.Participants {
			remove := (pReq.Remove != nil && *pReq.Remove)

			// --- Eliminar participante ---
			if remove {
				if pReq.ID == nil {
					// No hay ID => ignoramos (o podrías usar national_id + event_id)
					continue
				}
				if err := tx.Where("id = ? AND event_id = ?", *pReq.ID, eventID).
					Delete(&models.EventParticipant{}).Error; err != nil {
					return fmt.Errorf("error deleting participant %d: %w", idx, err)
				}
				continue
			}

			// --- Agregar o actualizar participante ---

			nationalID := strings.TrimSpace(pReq.NationalID)
			if nationalID == "" {
				return fmt.Errorf("participant %d has empty national_id", idx)
			}

			// Buscar/crear UserDetail por DNI
			var userDetail models.UserDetail
			err := tx.Where("national_id = ?", nationalID).First(&userDetail).Error
			if err != nil {
				if err == gorm.ErrRecordNotFound {
					// Crear nuevo UserDetail
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
						return fmt.Errorf("error creating user_detail for participant %d: %w", idx, createErr)
					}
				} else {
					return fmt.Errorf("error fetching user_detail for participant %d: %w", idx, err)
				}
			} else {
				// Opcional: actualizar datos básicos de UserDetail si vienen
				updated := false
				if pReq.FirstName != nil && strings.TrimSpace(*pReq.FirstName) != "" {
					userDetail.FirstName = strings.TrimSpace(*pReq.FirstName)
					updated = true
				}
				if pReq.LastName != nil && strings.TrimSpace(*pReq.LastName) != "" {
					userDetail.LastName = strings.TrimSpace(*pReq.LastName)
					updated = true
				}
				if pReq.Phone != nil {
					if strings.TrimSpace(*pReq.Phone) == "" {
						userDetail.Phone = nil
					} else {
						ph := strings.TrimSpace(*pReq.Phone)
						userDetail.Phone = &ph
					}
					updated = true
				}
				if pReq.Email != nil {
					if strings.TrimSpace(*pReq.Email) == "" {
						userDetail.Email = nil
					} else {
						em := strings.TrimSpace(*pReq.Email)
						userDetail.Email = &em
					}
					updated = true
				}
				if updated {
					userDetail.UpdatedAt = now
					if err := tx.Save(&userDetail).Error; err != nil {
						return fmt.Errorf("error updating user_detail for participant %d: %w", idx, err)
					}
				}
			}

			// Buscar participante existente
			var participant models.EventParticipant
			var participantErr error

			if pReq.ID != nil {
				participantErr = tx.Where("id = ? AND event_id = ?", *pReq.ID, eventID).
					First(&participant).Error
			} else {
				participantErr = tx.Where("event_id = ? AND user_detail_id = ?", eventID, userDetail.ID).
					First(&participant).Error
			}

			if participantErr != nil {
				if participantErr == gorm.ErrRecordNotFound {
					// Crear nuevo participant
					participant = models.EventParticipant{
						ID:           uuid.New(),
						EventID:      eventID,
						UserDetailID: userDetail.ID,
						CreatedAt:    now,
						UpdatedAt:    now,
					}
				} else {
					return fmt.Errorf("error fetching event participant %d: %w", idx, participantErr)
				}
			}

			// Actualizar campos opcionales
			if pReq.RegistrationSource != nil {
				trimmed := strings.TrimSpace(*pReq.RegistrationSource)
				if trimmed == "" {
					participant.RegistrationSource = nil
				} else {
					participant.RegistrationSource = &trimmed
				}
			}
			if pReq.RegistrationStatus != nil {
				status := strings.TrimSpace(*pReq.RegistrationStatus)
				if status != "" {
					participant.RegistrationStatus = status
				}
			}
			if pReq.AttendanceStatus != nil {
				as := strings.TrimSpace(*pReq.AttendanceStatus)
				if as != "" {
					participant.AttendanceStatus = as
				}
			}

			participant.UserDetailID = userDetail.ID
			participant.UpdatedAt = now

			if participant.ID == uuid.Nil {
				participant.ID = uuid.New()
				if err := tx.Create(&participant).Error; err != nil {
					return fmt.Errorf("error creating event participant %d: %w", idx, err)
				}
			} else {
				if err := tx.Save(&participant).Error; err != nil {
					return fmt.Errorf("error updating event participant %d: %w", idx, err)
				}
			}
		}

		return nil
	})
}
