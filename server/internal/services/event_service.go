package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventService interface {
	CreateEvent(ctx context.Context, createdBy uuid.UUID, in dto.CreateEventRequest) (uuid.UUID, string, error)
	UpdateEvent(ctx context.Context, eventID uuid.UUID, in dto.UpdateEventRequest) (uuid.UUID, string, error)
	ListEvents(ctx context.Context, in dto.ListEventsQuery) (*dto.ListEventsResult, error)
	GetEventDetail(ctx context.Context, eventID uuid.UUID, userID *uuid.UUID) (*dto.EventDetailResponse, error)

	UploadEventParticipants(ctx context.Context, eventID uuid.UUID, participants []dto.CreateEventParticipantRequest) (uuid.UUID, string, int, error)
	RemoveEventParticipant(ctx context.Context, eventID uuid.UUID, participantUserDetailID uuid.UUID, actorID uuid.UUID) (uuid.UUID, string, error)
	ListEventParticipants(ctx context.Context, eventID uuid.UUID, in dto.ListEventParticipantsQuery) (*dto.ListEventParticipantsResult, error)
	GenerateEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error)
	SignEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error)
	PublishEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error)
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

var (
	ErrEventNotFound  = errors.New("event not found")
	ErrEventForbidden = errors.New("event does not belong to this user")
)

func (s *eventServiceImpl) GetEventDetail(ctx context.Context, eventID uuid.UUID, userID *uuid.UUID) (*dto.EventDetailResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var ev models.Event

	// 1) Cargar evento + relaciones principales
	err := s.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Template").
		Preload("Template.Category").
		Preload("Schedules").
		Preload("EventParticipants.UserDetail").
		First(&ev, "id = ?", eventID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrEventNotFound
		}
		return nil, fmt.Errorf("error fetching event: %w", err)
	}

	// 2) Validar que el user_id (si viene) coincida con CreatedBy
	if userID != nil && ev.CreatedBy != *userID {
		return nil, ErrEventForbidden
	}

	// 3) Traer documentos (certificados) emitidos en este evento
	var docs []models.Document
	if err := s.db.WithContext(ctx).
		Where("event_id = ?", ev.ID).
		Find(&docs).Error; err != nil {
		return nil, fmt.Errorf("error fetching documents for event: %w", err)
	}

	// Mapear documentos por UserDetailID
	docsByUser := make(map[uuid.UUID][]dto.EventParticipantDocument)
	for _, d := range docs {
		pDoc := dto.EventParticipantDocument{
			ID:               d.ID,
			SerialCode:       d.SerialCode,
			VerificationCode: d.VerificationCode,
			Status:           d.Status,
			IssueDate:        d.IssueDate,
			TemplateID:       d.TemplateID,
		}
		docsByUser[d.UserDetailID] = append(docsByUser[d.UserDetailID], pDoc)
	}

	// 4) Mapear DocumentType
	docType := dto.EventDetailDocumentType{
		ID:   ev.DocumentType.ID,
		Code: ev.DocumentType.Code,
		Name: ev.DocumentType.Name,
	}

	// 5) Mapear Template (si existe) + Category
	var tpl *dto.EventDetailTemplate
	if ev.Template != nil {
		var categoryName *string
		if ev.Template.Category != nil {
			cn := ev.Template.Category.Name
			categoryName = &cn
		}

		t := &dto.EventDetailTemplate{
			ID:           ev.Template.ID,
			Name:         ev.Template.Name,
			CategoryName: categoryName,
			FileID:       ev.Template.FileID,
			IsActive:     ev.Template.IsActive,
			CreatedBy:    ev.Template.CreatedBy,
		}
		tpl = t
	}

	// 6) Mapear schedules
	schedules := make([]dto.EventDetailSchedule, 0, len(ev.Schedules))
	for _, sch := range ev.Schedules {
		schedules = append(schedules, dto.EventDetailSchedule{
			StartDatetime: sch.StartDatetime,
			EndDatetime:   sch.EndDatetime,
		})
	}

	// 7) Mapear participantes + documentos por participante
	participants := make([]dto.EventParticipantDetail, 0, len(ev.EventParticipants))
	for _, ep := range ev.EventParticipants {
		ud := ep.UserDetail

		p := dto.EventParticipantDetail{
			UserDetailID:       ud.ID,
			NationalID:         ud.NationalID,
			FirstName:          ud.FirstName,
			LastName:           ud.LastName,
			Email:              ud.Email,
			Phone:              ud.Phone,
			RegistrationSource: ep.RegistrationSource,
			RegistrationStatus: ep.RegistrationStatus,
			AttendanceStatus:   ep.AttendanceStatus,
			Documents:          docsByUser[ud.ID], // certificados de este evento para este participante
		}

		participants = append(participants, p)
	}

	// 8) Armar respuesta final
	out := &dto.EventDetailResponse{
		ID:                  ev.ID,
		Title:               ev.Title,
		Description:         ev.Description,
		DocumentType:        docType,
		Template:            tpl,
		Location:            ev.Location,
		MaxParticipants:     ev.MaxParticipants,
		RegistrationOpenAt:  ev.RegistrationOpenAt,
		RegistrationCloseAt: ev.RegistrationCloseAt,
		Status:              ev.Status,
		CreatedBy:           ev.CreatedBy,
		CreatedAt:           ev.CreatedAt,
		UpdatedAt:           ev.UpdatedAt,
		Schedules:           schedules,
		Participants:        participants,
	}

	return out, nil
}

func (s *eventServiceImpl) GenerateEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error) {
	now := time.Now().UTC()

	var event models.Event
	createdCount := 0

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Evento + validaciones
		if err := tx.Preload("DocumentType").
			Preload("Template").
			First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		if event.TemplateID == nil {
			return errors.New("event has no template assigned")
		}

		// 2) Participantes a procesar
		userDetails, err := s.getEventParticipantsUserDetails(ctx, tx, eventID, participantIDs)
		if err != nil {
			return err
		}
		if len(userDetails) == 0 {
			return errors.New("no participants to generate certificates for")
		}

		for _, ud := range userDetails {
			// 3) Evitar duplicados: ya tiene documento de este evento
			var existing models.Document
			if err := tx.Where("event_id = ? AND user_detail_id = ?", event.ID, ud.ID).
				First(&existing).Error; err == nil {
				// ya existe → omitir
				continue
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			// 4) Generar códigos (aquí luego puedes implementar tu lógica real)
			serialCode := "SER-" + uuid.New().String()
			verificationCode := "VER-" + uuid.New().String()
			doc := &models.Document{
				UserDetailID:           ud.ID,
				EventID:                &event.ID,
				DocumentTypeID:         event.DocumentTypeID,
				TemplateID:             event.TemplateID,
				SerialCode:             serialCode,
				VerificationCode:       verificationCode,
				HashValue:              "", // se llenará al generar el PDF
				QRText:                 nil,
				IssueDate:              now,
				SignedAt:               nil,
				DigitalSignatureStatus: "PENDING_SIGN", // etapa: pendiente de firma
				Status:                 "GENERATED",    // o "ISSUED", como prefieras
				CreatedBy:              actorID,
				CreatedAt:              now,
				UpdatedAt:              now,
			}

			if err := tx.Create(doc).Error; err != nil {
				return err
			}

			// 5) Crear/actualizar PDF (versión "para firma")
			pdf := &models.DocumentPDF{
				DocumentID: doc.ID,
				Stage:      "draft", // o "pending_sign"
				Version:    1,       // podrías calcular la versión previa +1 si quieres
				FileName:   "draft-" + doc.ID.String() + ".pdf",
				FileID:     uuid.New(),
				FileHash:   "",
				CreatedAt:  now,
			}

			// 👉 Aquí deberías llamar a tu servicio de generación de PDF:
			// - construir el PDF usando la plantilla (event.Template)
			// - renderizar datos del usuario, evento, etc.
			// - subir a tu storage y obtener FileID, FileHash, FileSizeBytes, StorageProvider
			//
			// EJEMPLO:
			// pdfBytes := pdfService.GenerateDraft(doc, event, ud)
			// stored := fileStorage.Upload(pdfBytes)
			// pdf.FileID = stored.FileID
			// pdf.FileHash = stored.Hash
			// pdf.FileSizeBytes = &stored.Size
			// pdf.StorageProvider = &stored.Provider

			// Siempre creas un nuevo registro
			if err := tx.Create(pdf).Error; err != nil {
				return err
			}

			createdCount++
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", 0, err
	}

	// Notificar al actor que se generaron certificados (opcional)
	if s.noti != nil && createdCount > 0 {
		_ = s.noti.NotifyUser(
			ctx,
			actorID,
			"Certificados generados",
			"Se generaron certificados en estado pending_sign para el evento: "+event.Title,
			ptrString("DOCUMENT"),
		)
	}

	return event.ID, event.Title, createdCount, nil
}

func (s *eventServiceImpl) SignEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error) {
	now := time.Now().UTC()

	var event models.Event
	signedCount := 0

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Verificar evento
		if err := tx.First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		// 2) Traer documentos en estado pendiente de firma
		var docs []models.Document
		q := tx.
			Where("event_id = ? AND digital_signature_status = ?", eventID, "PENDING_SIGN")

		if len(participantIDs) > 0 {
			q = q.Where("user_detail_id IN ?", participantIDs)
		}

		if err := q.Find(&docs).Error; err != nil {
			return err
		}
		if len(docs) == 0 {
			return errors.New("no certificates in pending_sign state to sign")
		}

		for i := range docs {
			doc := &docs[i]

			// 3) Obtener el último PDF generado para este documento
			//    Normalmente será el "draft" o "pending_sign".
			var lastPDF models.DocumentPDF
			err := tx.
				Where("document_id = ?", doc.ID).
				Order("version DESC").
				First(&lastPDF).Error

			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}

			// Si no hay PDF previo, igual continuamos pero con versión base 1
			nextVersion := 1
			if err == nil {
				nextVersion = lastPDF.Version + 1
			}

			// 4) Aquí iría la lógica REAL de firma digital
			//    ------------------------------------------------
			//    Ejemplo conceptual:
			//
			//    // 4.1 Descargar el PDF base
			//    baseBytes := fileStorage.Download(lastPDF.FileID)
			//
			//    // 4.2 Firmar con tu servicio de firma
			//    signedBytes := signService.Sign(baseBytes, signingKey, certChain)
			//
			//    // 4.3 Subir el PDF firmado al storage
			//    stored := fileStorage.Upload(signedBytes)
			//
			//    // 4.4 Usar los datos de storage para llenar el PDF firmado
			//    fileID := stored.FileID
			//    fileHash := stored.Hash
			//    fileSize := stored.Size
			//    provider := stored.Provider
			//
			//    ------------------------------------------------
			//
			//    Por ahora dejamos placeholders (para que no falle
			//    compilar) y solo sepas dónde enganchar tu servicio:

			fileID := uuid.New()        // <- reemplazar por ID real del storage
			fileHash := "HASH_SIGNED"   // <- reemplazar por hash real del PDF firmado
			var fileSize *int64         // <- tamaño en bytes, si lo tienes
			var storageProvider *string // <- nombre del storage, ej: "s3", "local"

			// 5) Crear un nuevo registro de PDF para la versión FIRMADA
			signedPDF := &models.DocumentPDF{
				DocumentID:      doc.ID,
				Stage:           "signed", // importante: marcar etapa
				Version:         nextVersion,
				FileName:        "signed-" + doc.ID.String() + ".pdf",
				FileID:          fileID,
				FileHash:        fileHash,
				FileSizeBytes:   fileSize,
				StorageProvider: storageProvider,
				CreatedAt:       now,
			}

			if err := tx.Create(signedPDF).Error; err != nil {
				return err
			}

			// 6) Actualizar estado del documento
			doc.DigitalSignatureStatus = "SIGNED"
			doc.SignedAt = &now
			doc.UpdatedAt = now

			if err := tx.Save(doc).Error; err != nil {
				return err
			}

			signedCount++
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", 0, err
	}

	// 7) Notificar al actor (admin / firmante)
	if s.noti != nil && signedCount > 0 {
		_ = s.noti.NotifyUser(
			ctx,
			actorID,
			"Certificados firmados",
			"Se firmaron certificados del evento: "+event.Title,
			ptrString("DOCUMENT"),
		)
	}

	return event.ID, event.Title, signedCount, nil
}

func (s *eventServiceImpl) PublishEventCertificates(ctx context.Context, eventID, actorID uuid.UUID, participantIDs []uuid.UUID) (uuid.UUID, string, int, error) {
	now := time.Now().UTC()

	var event models.Event
	publishedCount := 0

	// guardaremos national_ids para notificar a usuarios con cuenta
	type userNotify struct {
		UserID uuid.UUID
	}
	var notifyUsers []userNotify

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		// Documentos firmados a publicar
		var docs []models.Document
		q := tx.Where("event_id = ? AND digital_signature_status = ?", eventID, "SIGNED")

		if len(participantIDs) > 0 {
			q = q.Where("user_detail_id IN ?", participantIDs)
		}

		if err := q.Find(&docs).Error; err != nil {
			return err
		}
		if len(docs) == 0 {
			return errors.New("no signed certificates to publish")
		}

		// Cargar user_details para QR / notificación
		var userDetails []models.UserDetail
		if err := tx.Where("id IN ?", collectUserDetailIDs(docs)).
			Find(&userDetails).Error; err != nil {
			return err
		}
		udByID := make(map[uuid.UUID]models.UserDetail)
		for _, ud := range userDetails {
			udByID[ud.ID] = ud
		}

		for i := range docs {
			doc := &docs[i]
			// ud := udByID[doc.UserDetailID]

			// 1) Generar texto del QR (ejemplo)
			// Aquí puedes incluir URL de verificación + verificationCode + hash, etc.
			qrText := "https://tu-dominio/verify?code=" + doc.VerificationCode

			doc.QRText = &qrText

			// 2) Calcular hash del PDF final (aquí solo placeholder)
			// EJEMPLO REAL:
			// pdfBytes := fileStorage.Download(pdf.FileID)
			// hash := cryptoService.Hash(pdfBytes)
			// doc.HashValue = hash
			doc.HashValue = "HASH_PLACEHOLDER"

			// 3) Marcar como generado/publicado
			doc.Status = "GENERATED" // o "ISSUED"
			if doc.IssueDate.IsZero() {
				doc.IssueDate = now
			}
			doc.UpdatedAt = now

			// 4) Actualizar PDF final (con QR embebido)
			// 👉 Aquí va tu lógica para:
			// - abrir el PDF firmado
			// - incrustar el QR
			// - volver a subir el PDF final
			//
			// EJEMPLO:
			// pdf := current DocumentPDF
			// finalBytes := pdfService.EmbedQR(signedBytes, qrImage)
			// stored := fileStorage.Upload(finalBytes)
			// pdf.FileID = stored.FileID
			// pdf.FileHash = stored.Hash
			// pdf.FileSizeBytes = &stored.Size

			if err := tx.Save(doc).Error; err != nil {
				return err
			}

			publishedCount++
		}

		// Preparar usuarios a notificar (tienen cuenta)
		// JOIN user_details -> users
		if err := tx.
			Table("documents AS d").
			Select("DISTINCT u.id").
			Joins("JOIN user_details AS ud ON ud.id = d.user_detail_id").
			Joins("JOIN users AS u ON u.national_id = ud.national_id").
			Where("d.event_id = ? AND d.digital_signature_status = ? AND d.status = ?", eventID, "SIGNED", "GENERATED").
			Scan(&notifyUsers).Error; err != nil {
			// si falla la query de notificaciones, no romper publicacion
			notifyUsers = nil
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", 0, err
	}

	// Notificar a los usuarios con cuenta
	if s.noti != nil && publishedCount > 0 {
		seen := make(map[uuid.UUID]struct{})
		for _, nu := range notifyUsers {
			if _, ok := seen[nu.UserID]; ok {
				continue
			}
			seen[nu.UserID] = struct{}{}

			_ = s.noti.NotifyUser(
				ctx,
				nu.UserID,
				"Certificado disponible",
				"Tu certificado del evento \""+event.Title+"\" ya está disponible.",
				ptrString("DOCUMENT"),
			)
		}

		// Notificar al actor (admin)
		_ = s.noti.NotifyUser(
			ctx,
			actorID,
			"Certificados publicados",
			"Se publicaron certificados del evento: "+event.Title,
			ptrString("DOCUMENT"),
		)
	}

	return event.ID, event.Title, publishedCount, nil
}

func collectUserDetailIDs(docs []models.Document) []uuid.UUID {
	m := make(map[uuid.UUID]struct{})
	for _, d := range docs {
		m[d.UserDetailID] = struct{}{}
	}
	res := make([]uuid.UUID, 0, len(m))
	for id := range m {
		res = append(res, id)
	}
	return res
}

func (s *eventServiceImpl) ListEventParticipants(ctx context.Context, eventID uuid.UUID, in dto.ListEventParticipantsQuery) (*dto.ListEventParticipantsResult, error) {
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

	search := strings.TrimSpace(in.SearchQuery)

	// ---------- 1) Verificar que el evento exista (opcional pero útil) ----------
	var exists int64
	if err := s.db.WithContext(ctx).
		Table("events").
		Where("id = ?", eventID).
		Count(&exists).Error; err != nil {
		return nil, err
	}
	if exists == 0 {
		return nil, errors.New("event not found")
	}

	// ---------- 2) TOTAL ----------
	var total int64
	countQuery := s.db.WithContext(ctx).
		Table("event_participants AS ep").
		Joins("JOIN user_details AS ud ON ud.id = ep.user_detail_id").
		Where("ep.event_id = ?", eventID)

	if search != "" {
		like := "%" + search + "%"
		countQuery = countQuery.Where(
			"(ud.first_name ILIKE ? OR ud.last_name ILIKE ? OR (ud.first_name || ' ' || ud.last_name) ILIKE ?)",
			like, like, like,
		)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	if total == 0 {
		return &dto.ListEventParticipantsResult{
			Participants: []dto.EventParticipantListItem{},
			Filters: dto.EventParticipantsFilters{
				Page:        page,
				PageSize:    pageSize,
				Total:       0,
				HasNextPage: false,
				HasPrevPage: page > 1,
				SearchQuery: search,
			},
		}, nil
	}

	// ---------- 3) LISTA PÁGINA ----------
	var rows []struct {
		UserDetailID       uuid.UUID
		NationalID         string
		FirstName          string
		LastName           string
		Email              *string
		Phone              *string
		RegistrationSource *string
		RegistrationStatus string
		AttendanceStatus   string
	}

	listQuery := s.db.WithContext(ctx).
		Table("event_participants AS ep").
		Select(`
			ud.id AS user_detail_id,
			ud.national_id,
			ud.first_name,
			ud.last_name,
			ud.email,
			ud.phone,
			ep.registration_source,
			ep.registration_status,
			ep.attendance_status
		`).
		Joins("JOIN user_details AS ud ON ud.id = ep.user_detail_id").
		Where("ep.event_id = ?", eventID)

	if search != "" {
		like := "%" + search + "%"
		listQuery = listQuery.Where(
			"(ud.first_name ILIKE ? OR ud.last_name ILIKE ? OR (ud.first_name || ' ' || ud.last_name) ILIKE ?)",
			like, like, like,
		)
	}

	if err := listQuery.
		Order("ud.first_name ASC, ud.last_name ASC").
		Limit(pageSize).
		Offset(offset).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	participants := make([]dto.EventParticipantListItem, 0, len(rows))
	for _, r := range rows {
		fullName := strings.TrimSpace(r.FirstName + " " + r.LastName)
		item := dto.EventParticipantListItem{
			UserDetailID:       r.UserDetailID,
			NationalID:         r.NationalID,
			FullName:           fullName,
			FirstName:          r.FirstName,
			LastName:           r.LastName,
			Email:              r.Email,
			Phone:              r.Phone,
			RegistrationSource: r.RegistrationSource,
			RegistrationStatus: r.RegistrationStatus,
			AttendanceStatus:   r.AttendanceStatus,
		}
		participants = append(participants, item)
	}

	hasNext := int64(page*pageSize) < total
	hasPrev := page > 1

	res := &dto.ListEventParticipantsResult{
		Participants: participants,
		Filters: dto.EventParticipantsFilters{
			Page:        page,
			PageSize:    pageSize,
			Total:       total,
			HasNextPage: hasNext,
			HasPrevPage: hasPrev,
			SearchQuery: search,
		},
	}

	return res, nil
}

func (s *eventServiceImpl) RemoveEventParticipant(ctx context.Context, eventID uuid.UUID, participantUserDetailID uuid.UUID, actorID uuid.UUID) (uuid.UUID, string, error) {
	var event models.Event
	var userDetail models.UserDetail
	var participant models.EventParticipant

	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Verificar evento
		if err := tx.First(&event, "id = ?", eventID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("event not found")
			}
			return err
		}

		// 2) Verificar UserDetail (participante)
		if err := tx.First(&userDetail, "id = ?", participantUserDetailID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("participant not found")
			}
			return err
		}

		// 3) Verificar relación en event_participants
		if err := tx.
			Where("event_id = ? AND user_detail_id = ?", event.ID, userDetail.ID).
			First(&participant).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("participant is not registered in this event")
			}
			return err
		}

		// 4) Eliminar solo la relación
		if err := tx.Delete(&participant).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", err
	}

	// --- NOTIFICACIONES DESPUÉS DE LA TRANSACCIÓN ---

	// 1) Notificar al participante si tiene cuenta
	if s.noti != nil {
		var user models.User
		if err := s.db.WithContext(ctx).
			Where("national_id = ?", userDetail.NationalID).
			First(&user).Error; err == nil {
			_ = s.noti.NotifyUser(
				ctx,
				user.ID,
				"Removido de evento",
				"Has sido removido del evento: "+event.Title,
				ptrString("EVENT"),
			)
		}
	}

	// 2) Notificar al actor (quien ejecutó la operación)
	if s.noti != nil {
		_ = s.noti.NotifyUser(
			ctx,
			actorID,
			"Participante removido",
			"Has removido un participante del evento: "+event.Title,
			ptrString("EVENT"),
		)
	}

	return event.ID, event.Title, nil
}

func (s *eventServiceImpl) UploadEventParticipants(ctx context.Context, eventID uuid.UUID, participants []dto.CreateEventParticipantRequest) (uuid.UUID, string, int, error) {
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

	// search_query: solo se aplica sobre e.title
	search := strings.TrimSpace(in.SearchQuery)

	// ---------- 1) TOTAL ----------
	var total int64
	countQuery := s.db.WithContext(ctx).Table("events AS e")

	if search != "" {
		// SOLO nombre del evento
		countQuery = countQuery.Where("e.title ILIKE ?", "%"+search+"%")
	}

	if statusValue != "" {
		countQuery = countQuery.Where("e.status = ?", statusValue)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, err
	}

	if total == 0 {
		// No hay resultados pero igual devolvemos filtros completos
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

	// ---------- 2) LISTA PÁGINA (EVENTOS) ----------
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
		// SOLO nombre del evento
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

	// ---------- 3) OBTENER SCHEDULES PARA ESTOS EVENTOS ----------
	eventIDs := make([]uuid.UUID, 0, len(rows))
	for _, r := range rows {
		eventIDs = append(eventIDs, r.ID)
	}

	schedulesByEvent := make(map[uuid.UUID][]dto.EventScheduleItem)
	if len(eventIDs) > 0 {
		var scheduleRows []struct {
			EventID       uuid.UUID
			StartDatetime time.Time
			EndDatetime   time.Time
		}

		if err := s.db.WithContext(ctx).
			Table("event_schedules").
			Select("event_id, start_datetime, end_datetime").
			Where("event_id IN ?", eventIDs).
			Order("start_datetime ASC").
			Scan(&scheduleRows).Error; err != nil {
			return nil, err
		}

		for _, sr := range scheduleRows {
			item := dto.EventScheduleItem{
				StartDatetime: sr.StartDatetime,
				EndDatetime:   sr.EndDatetime,
			}
			schedulesByEvent[sr.EventID] = append(schedulesByEvent[sr.EventID], item)
		}
	}

	// ---------- 4) MAPEAR AL DTO FINAL ----------
	events := make([]dto.EventListItem, 0, len(rows))
	for _, r := range rows {
		item := dto.EventListItem{
			ID:                r.ID,
			Name:              r.Title,
			CategoryName:      r.CategoryName,
			DocumentTypeName:  r.DocumentTypeName,
			ParticipantsCount: r.ParticipantsCount,
			Status:            r.Status,
			Schedules:         schedulesByEvent[r.ID],
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

			// Validar que el tipo del template coincida con el del evento
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

		// 5) Actualizar SCHEDULES (solo si viene el campo)
		if in.Schedules != nil {
			// primero, borrar schedules actuales
			if err := tx.
				Where("event_id = ?", event.ID).
				Delete(&models.EventSchedule{}).Error; err != nil {
				return err
			}

			// si el arreglo viene vacío, simplemente deja el evento sin horarios
			for _, sch := range *in.Schedules {
				if sch.StartDatetime.IsZero() || sch.EndDatetime.IsZero() {
					return errors.New("schedule start_datetime and end_datetime are required")
				}
				if !sch.EndDatetime.After(sch.StartDatetime) {
					return errors.New("schedule end_datetime must be after start_datetime")
				}

				es := models.EventSchedule{
					EventID:       event.ID,
					StartDatetime: sch.StartDatetime,
					EndDatetime:   sch.EndDatetime,
					CreatedAt:     now,
				}

				if err := tx.Create(&es).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, "", err
	}

	// --- NOTIFICACIÓN SOLO AL ORGANIZADOR (NO a participantes) ---
	if s.noti != nil {
		_ = s.noti.NotifyUser(
			ctx,
			event.CreatedBy,
			"Evento actualizado",
			"Se han actualizado los detalles del evento: "+event.Title,
			ptrString("EVENT"),
		)
	}

	return event.ID, event.Title, nil
}

func (s *eventServiceImpl) CreateEvent(ctx context.Context, userID uuid.UUID, req dto.CreateEventRequest) (uuid.UUID, string, error) {
	if s.db == nil {
		return uuid.Nil, "", fmt.Errorf("database connection is nil")
	}

	if len(req.Schedules) == 0 {
		return uuid.Nil, "", fmt.Errorf("at least one schedule is required")
	}

	// Status por defecto
	status := "SCHEDULED"
	if req.Status != nil && *req.Status != "" {
		status = *req.Status
	}

	now := time.Now().UTC()

	event := models.Event{
		Title:               req.Title,
		Description:         req.Description,
		DocumentTypeID:      req.DocumentTypeID,
		TemplateID:          req.TemplateID,
		Location:            req.Location,
		MaxParticipants:     req.MaxParticipants,
		RegistrationOpenAt:  req.RegistrationOpenAt,
		RegistrationCloseAt: req.RegistrationCloseAt,
		Status:              status,
		CreatedBy:           userID,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	// Usamos transacción
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Crear evento
		if err := tx.Create(&event).Error; err != nil {
			return fmt.Errorf("error creating event: %w", err)
		}

		// 2) Crear schedules
		for _, sch := range req.Schedules {
			if sch.StartDatetime.IsZero() || sch.EndDatetime.IsZero() {
				return fmt.Errorf("schedule start_datetime and end_datetime are required")
			}
			if !sch.EndDatetime.After(sch.StartDatetime) {
				return fmt.Errorf("schedule end_datetime must be after start_datetime")
			}

			es := models.EventSchedule{
				EventID:       event.ID,
				StartDatetime: sch.StartDatetime,
				EndDatetime:   sch.EndDatetime,
				CreatedAt:     now,
			}

			if err := tx.Create(&es).Error; err != nil {
				return fmt.Errorf("error creating event schedule: %w", err)
			}
		}

		// 3) Crear participantes (si envías)
		// aquí dentro procesas req.Participants como ya lo tenías
		// ...

		return nil
	})

	if err != nil {
		return uuid.Nil, "", err
	}

	return event.ID, event.Title, nil
}

// helper para no repetir &"texto"
func ptrString(s string) *string {
	return &s
}

func (s *eventServiceImpl) getEventParticipantsUserDetails(ctx context.Context, tx *gorm.DB, eventID uuid.UUID, participantIDs []uuid.UUID) ([]models.UserDetail, error) {
	var rows []models.UserDetail

	q := tx.WithContext(ctx).
		Table("event_participants AS ep").
		Joins("JOIN user_details AS ud ON ud.id = ep.user_detail_id").
		Where("ep.event_id = ?", eventID)

	if len(participantIDs) > 0 {
		q = q.Where("ud.id IN ?", participantIDs)
	}

	if err := q.Select("ud.*").Scan(&rows).Error; err != nil {
		return nil, err
	}

	return rows, nil
}
