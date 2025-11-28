package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventService interface {
	// createdBy = usuario autenticado (organizador/admin)
	CreateEvent(ctx context.Context, createdBy uuid.UUID, in dto.CreateEventRequest) (uuid.UUID, string, error)

	// UpdateEvent: actualiza detalles del evento (no toca participantes)
	UpdateEvent(ctx context.Context, eventID uuid.UUID, in dto.UpdateEventRequest) (uuid.UUID, string, error)
	ListEvents(ctx context.Context, in dto.ListEventsQuery) (*dto.ListEventsResult, error)
	// Sube/añade participantes a un evento existente
	UploadEventParticipants(ctx context.Context, eventID uuid.UUID, participants []dto.CreateEventParticipantRequest) (uuid.UUID, string, int, error)
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

func (s *eventServiceImpl) UploadEventParticipants(
	ctx context.Context,
	eventID uuid.UUID,
	participants []dto.CreateEventParticipantRequest,
) (uuid.UUID, string, int, error) {
	now := time.Now().UTC()

	var event models.Event
	participantUserIDs := make(map[uuid.UUID]struct{})
	addedCount := 0

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Verificar que el evento exista
		if err := tx.First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		// 2) Procesar participantes
		for _, p := range participants {
			if p.NationalID == "" {
				return errors.New("participant.national_id is required")
			}

			// a) Buscar / crear UserDetail
			var userDetail models.UserDetail
			err := tx.
				Where("national_id = ?", p.NationalID).
				First(&userDetail).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				// No existe → debe crear
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

			// b) Estados por defecto
			regStatus := "REGISTERED"
			if p.RegistrationStatus != nil && *p.RegistrationStatus != "" {
				regStatus = *p.RegistrationStatus
			}

			attStatus := "PENDING"
			if p.AttendanceStatus != nil && *p.AttendanceStatus != "" {
				attStatus = *p.AttendanceStatus
			}

			// c) Crear relación EventParticipant (si no existe)
			participant := &models.EventParticipant{
				EventID:            event.ID,
				UserDetailID:       userDetail.ID,
				RegistrationSource: p.RegistrationSource,
				RegistrationStatus: regStatus,
				AttendanceStatus:   attStatus,
				CreatedAt:          now,
				UpdatedAt:          now,
			}

			res := tx.
				Where("event_id = ? AND user_detail_id = ?", event.ID, userDetail.ID).
				Attrs(map[string]interface{}{
					"registration_source": participant.RegistrationSource,
					"registration_status": participant.RegistrationStatus,
					"attendance_status":   participant.AttendanceStatus,
					"created_at":          participant.CreatedAt,
					"updated_at":          participant.UpdatedAt,
				}).
				FirstOrCreate(participant)

			if res.Error != nil {
				return res.Error
			}

			// Solo contamos si se creó una nueva relación
			if res.RowsAffected > 0 {
				addedCount++
			}

			// d) Si tiene cuenta (User) con ese DNI → guardar para notificación
			var user models.User
			if err := tx.
				Where("national_id = ?", p.NationalID).
				First(&user).Error; err == nil {
				participantUserIDs[user.ID] = struct{}{}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", 0, err
	}

	// --- NOTIFICACIONES DESPUÉS DE LA TRANSACCIÓN ---

	// Notificar a participantes que tienen cuenta (User)
	if s.noti != nil {
		for uid := range participantUserIDs {
			_ = s.noti.NotifyUser(
				ctx,
				uid,
				"Inscripción a evento",
				"Has sido inscrito al evento: "+event.Title,
				ptrString("EVENT"),
			)
		}
	}

	return event.ID, event.Title, addedCount, nil
}

func (s *eventServiceImpl) ListEvents(ctx context.Context, in dto.ListEventsQuery) (*dto.ListEventsResult, error) {
	// Normalizar paginado
	page := in.Page
	if page <= 0 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// Normalizar status: scheduled, in_progress, completed → SCHEDULED, IN_PROGRESS, COMPLETED
	statusFilter := strings.TrimSpace(strings.ToLower(in.Status))
	var statusValue string
	switch statusFilter {
	case "scheduled":
		statusValue = "SCHEDULED"
	case "in_progress":
		statusValue = "IN_PROGRESS"
	case "completed":
		statusValue = "COMPLETED"
	case "", "all":
		statusValue = "" // sin filtro
	default:
		// si manda algo raro, lo tratamos como "all"
		statusValue = ""
	}

	search := strings.TrimSpace(in.SearchQuery)

	// ---------- 1) TOTAL ----------
	var total int64
	countQuery := s.db.WithContext(ctx).Table("events AS e")

	if search != "" {
		countQuery = countQuery.Where("e.title ILIKE ?", "%"+search+"%")
	}

	if statusValue != "" {
		countQuery = countQuery.Where("e.status = ?", statusValue)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	if total == 0 {
		return &dto.ListEventsResult{
			Events: []dto.EventListItem{},
			Filters: dto.EventListFilters{
				Page:        page,
				PageSize:    pageSize,
				Total:       0,
				HasNextPage: false,
				HasPrevPage: page > 1,
				SearchQuery: search,
				Status:      statusFilterOrAll(statusFilter),
			},
		}, nil
	}

	// ---------- 2) LISTA PÁGINA ----------
	var rows []struct {
		ID                uuid.UUID
		Title             string
		DocumentTypeName  string
		CategoryName      *string
		Status            string
		ParticipantsCount int64
	}

	listQuery := s.db.WithContext(ctx).
		Table("events AS e").
		Select(`
			e.id,
			e.title,
			dt.name AS document_type_name,
			dc.name AS category_name,
			e.status,
			COALESCE(COUNT(ep.id), 0) AS participants_count
		`).
		Joins("JOIN document_types AS dt ON dt.id = e.document_type_id").
		Joins("LEFT JOIN document_templates AS t ON t.id = e.template_id").
		Joins("LEFT JOIN document_categories AS dc ON dc.id = t.category_id").
		Joins("LEFT JOIN event_participants AS ep ON ep.event_id = e.id")

	if search != "" {
		listQuery = listQuery.Where("e.title ILIKE ?", "%"+search+"%")
	}
	if statusValue != "" {
		listQuery = listQuery.Where("e.status = ?", statusValue)
	}

	if err := listQuery.
		Group("e.id, e.title, dt.name, dc.name, e.status").
		Order("e.created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	events := make([]dto.EventListItem, 0, len(rows))
	for _, r := range rows {
		item := dto.EventListItem{
			ID:                r.ID,
			Name:              r.Title,
			CategoryName:      r.CategoryName,
			DocumentTypeName:  r.DocumentTypeName,
			ParticipantsCount: r.ParticipantsCount,
			Status:            r.Status,
		}
		events = append(events, item)
	}

	hasNext := int64(page*pageSize) < total
	hasPrev := page > 1

	res := &dto.ListEventsResult{
		Events: events,
		Filters: dto.EventListFilters{
			Page:        page,
			PageSize:    pageSize,
			Total:       total,
			HasNextPage: hasNext,
			HasPrevPage: hasPrev,
			SearchQuery: search,
			Status:      statusFilterOrAll(statusFilter),
		},
	}

	return res, nil
}

// helper pequeño para normalizar "all"
func statusFilterOrAll(s string) string {
	if s == "" {
		return "all"
	}
	return s
}

func (s *eventServiceImpl) UpdateEvent(ctx context.Context, eventID uuid.UUID, in dto.UpdateEventRequest) (uuid.UUID, string, error) {
	now := time.Now().UTC()
	var event models.Event

	// Usamos transacción para asegurar consistencia al cambiar tipo / plantilla
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Cargar evento
		if err := tx.First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		// 2) Actualizar/validar DocumentType si viene
		if in.DocumentTypeID != nil {
			var docType models.DocumentType
			if err := tx.
				Where("id = ? AND is_active = TRUE", *in.DocumentTypeID).
				First(&docType).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("document_type not found or inactive")
				}
				return err
			}

			event.DocumentTypeID = *in.DocumentTypeID
		}

		// 3) Actualizar/validar Template si viene
		if in.TemplateID != nil {
			var template models.DocumentTemplate
			if err := tx.
				Where("id = ? AND is_active = TRUE", *in.TemplateID).
				First(&template).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("template not found or inactive")
				}
				return err
			}

			// Validar que el tipo de documento de la plantilla coincida con el del evento
			documentTypeID := event.DocumentTypeID
			if in.DocumentTypeID != nil {
				documentTypeID = *in.DocumentTypeID
			}

			if template.DocumentTypeID != documentTypeID {
				return errors.New("template document_type does not match event document_type")
			}

			event.TemplateID = in.TemplateID
		}

		// 4) Otros campos simples
		if in.Title != nil {
			event.Title = *in.Title
		}
		if in.Description != nil {
			event.Description = in.Description
		}
		if in.Location != nil {
			event.Location = *in.Location
		}
		if in.MaxParticipants != nil {
			event.MaxParticipants = in.MaxParticipants
		}
		if in.RegistrationOpenAt != nil {
			event.RegistrationOpenAt = in.RegistrationOpenAt
		}
		if in.RegistrationCloseAt != nil {
			event.RegistrationCloseAt = in.RegistrationCloseAt
		}
		if in.Status != nil && *in.Status != "" {
			event.Status = *in.Status
		}

		event.UpdatedAt = now

		if err := tx.Save(&event).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", err
	}

	// --- NOTIFICACIONES DESPUÉS DE LA TRANSACCIÓN ---

	// 1) Notificar al organizador
	if s.noti != nil {
		_ = s.noti.NotifyUser(
			ctx,
			event.CreatedBy,
			"Evento actualizado",
			"Se han actualizado los detalles del evento: "+event.Title,
			ptrString("EVENT"),
		)
	}

	// 2) Notificar a participantes que tienen cuenta (User asociado por DNI)
	if s.noti != nil {
		type userRow struct {
			ID uuid.UUID
		}

		var rows []userRow
		// event_participants -> user_details -> users (por national_id)
		if err := s.db.WithContext(ctx).
			Table("event_participants").
			Select("users.id").
			Joins("JOIN user_details ON event_participants.user_detail_id = user_details.id").
			Joins("JOIN users ON users.national_id = user_details.national_id").
			Where("event_participants.event_id = ?", eventID).
			Scan(&rows).Error; err == nil {

			seen := make(map[uuid.UUID]struct{})
			for _, r := range rows {
				if _, ok := seen[r.ID]; ok {
					continue
				}
				seen[r.ID] = struct{}{}

				_ = s.noti.NotifyUser(
					ctx,
					r.ID,
					"Detalles de evento actualizados",
					"Se han actualizado los detalles del evento: "+event.Title,
					ptrString("EVENT"),
				)
			}
		}
	}

	return event.ID, event.Title, nil
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
