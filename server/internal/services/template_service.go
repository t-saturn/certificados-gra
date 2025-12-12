package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TemplateService interface {
	CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.CreateTemplateRequest) (*models.DocumentTemplate, error)
	ListTemplates(ctx context.Context, params dto.TemplateListQuery) (*dto.TemplateListResponse, error)
	UpdateTemplate(ctx context.Context, templateID uuid.UUID, userID uuid.UUID, in dto.UpdateTemplateRequest) (*models.DocumentTemplate, error)
}

type templateServiceImpl struct {
	db   *gorm.DB
	noti NotificationService
}

func NewTemplateService(db *gorm.DB, noti NotificationService) TemplateService {
	return &templateServiceImpl{
		db:   db,
		noti: noti,
	}
}

func (s *templateServiceImpl) UpdateTemplate(ctx context.Context, templateID uuid.UUID, userID uuid.UUID, in dto.UpdateTemplateRequest) (*models.DocumentTemplate, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Buscar plantilla
	var template models.DocumentTemplate
	if err := s.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		First(&template, "id = ?", templateID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("error fetching template: %w", err)
	}

	// Actualizar campos solo si vienen en el request
	if in.Name != nil {
		template.Name = *in.Name
	}
	if in.Description != nil {
		template.Description = in.Description
	}
	if in.DocumentTypeID != nil && *in.DocumentTypeID != "" {
		docTypeID, err := uuid.Parse(*in.DocumentTypeID)
		if err != nil {
			return nil, fmt.Errorf("invalid document_type_id: %w", err)
		}
		template.DocumentTypeID = docTypeID
	}
	if in.CategoryID != nil {
		template.CategoryID = in.CategoryID
	}
	if in.FileID != nil && *in.FileID != "" {
		fileID, err := uuid.Parse(*in.FileID)
		if err != nil {
			return nil, fmt.Errorf("invalid file_id: %w", err)
		}
		template.FileID = fileID
	}
	if in.PrevFileID != nil && *in.PrevFileID != "" {
		prevFileID, err := uuid.Parse(*in.PrevFileID)
		if err != nil {
			return nil, fmt.Errorf("invalid prev_file_id: %w", err)
		}
		template.PrevFileID = prevFileID
	}
	if in.IsActive != nil {
		template.IsActive = *in.IsActive
	}

	template.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&template).Error; err != nil {
		return nil, fmt.Errorf("error updating template: %w", err)
	}

	// Notificación
	if s.noti != nil {
		notifType := "TEMPLATE"
		title := "Plantilla actualizada"
		body := fmt.Sprintf("Se ha actualizado la plantilla '%s'.", template.Name)

		if err := s.noti.NotifyUser(ctx, userID, title, body, &notifType); err != nil {
			// En desarrollo te conviene ver el error; luego podrías solo loguearlo
			return nil, fmt.Errorf("template updated but failed to create notification: %w", err)
		}
	}

	return &template, nil
}

func (s *templateServiceImpl) ListTemplates(ctx context.Context, params dto.TemplateListQuery) (*dto.TemplateListResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Normalizar page y page_size
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

	var docTypeID *uuid.UUID

	// Si viene type (CERTIFICATE, CONSTANCY, etc.), buscamos su ID
	if params.Type != nil && *params.Type != "" {
		var dt models.DocumentType
		err := s.db.WithContext(ctx).
			Where("code = ?", *params.Type).
			First(&dt).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// No existe ese tipo → lista vacía pero sin error
				filters := dto.TemplateListFilters{
					Page:        page,
					PageSize:    pageSize,
					Total:       0,
					HasNextPage: false,
					HasPrevPage: page > 1,
					SearchQuery: params.SearchQuery,
					Type:        params.Type,
				}
				return &dto.TemplateListResponse{
					Data:    []dto.TemplateItem{},
					Filters: filters,
				}, nil
			}
			return nil, fmt.Errorf("error buscando document_type '%s': %w", *params.Type, err)
		}

		docTypeID = &dt.ID
	}

	// Construir query base
	query := s.db.WithContext(ctx).
		Model(&models.DocumentTemplate{}).
		Preload("DocumentType").
		Preload("Category").
		Where("is_active = TRUE") // 👈 SOLO plantillas activas

	// Filtro por tipo
	if docTypeID != nil {
		query = query.Where("document_type_id = ?", *docTypeID)
	}

	// Filtro por búsqueda en nombre
	if params.SearchQuery != nil && *params.SearchQuery != "" {
		q := "%" + *params.SearchQuery + "%"
		query = query.Where("name ILIKE ?", q)
	}

	// Contar total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("error contando plantillas: %w", err)
	}

	// Paginación
	offset := (page - 1) * pageSize

	var templates []models.DocumentTemplate
	if err := query.
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&templates).Error; err != nil {
		return nil, fmt.Errorf("error obteniendo plantillas: %w", err)
	}

	// Mapear a DTOs
	items := make([]dto.TemplateItem, 0, len(templates))
	for _, t := range templates {
		var categoryName *string
		if t.Category != nil {
			name := t.Category.Name
			categoryName = &name
		}

		item := dto.TemplateItem{
			ID:               t.ID,
			Name:             t.Name,
			Description:      t.Description,
			DocumentTypeID:   t.DocumentTypeID,
			DocumentTypeCode: t.DocumentType.Code,
			DocumentTypeName: t.DocumentType.Name,
			CategoryID:       t.CategoryID,
			CategoryName:     categoryName,
			FileID:           t.FileID,
			PrevFileID:       t.PrevFileID,
			IsActive:         t.IsActive,
			CreatedBy:        t.CreatedBy,
			CreatedAt:        t.CreatedAt,
			UpdatedAt:        t.UpdatedAt,
		}

		items = append(items, item)
	}

	hasNext := int64(page*pageSize) < total
	hasPrev := page > 1

	filters := dto.TemplateListFilters{
		Page:        page,
		PageSize:    pageSize,
		Total:       total,
		HasNextPage: hasNext,
		HasPrevPage: hasPrev,
		SearchQuery: params.SearchQuery,
		Type:        params.Type,
	}

	return &dto.TemplateListResponse{
		Data:    items,
		Filters: filters,
	}, nil
}

func (s *templateServiceImpl) CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.CreateTemplateRequest) (*models.DocumentTemplate, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Validaciones mínimas (podrías usar validator/v10 si quieres)
	if in.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if in.DocumentTypeID == "" {
		return nil, fmt.Errorf("document_type_id is required")
	}
	if in.FileID == "" {
		return nil, fmt.Errorf("file_id is required")
	}
	if in.PrevFileID == "" {
		return nil, fmt.Errorf("prev_file_id is required")
	}

	// Parse de UUIDs
	docTypeID, err := uuid.Parse(in.DocumentTypeID)
	if err != nil {
		return nil, fmt.Errorf("invalid document_type_id: %w", err)
	}

	fileID, err := uuid.Parse(in.FileID)
	if err != nil {
		return nil, fmt.Errorf("invalid file_id: %w", err)
	}
	prevFileID, err := uuid.Parse(in.PrevFileID)
	if err != nil {
		return nil, fmt.Errorf("invalid prev_file_id: %w", err)
	}

	// (Opcional) Verificar que el usuario exista
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("error checking user: %w", err)
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	template := &models.DocumentTemplate{
		// ID lo puede generar la DB (gen_random_uuid()) por el default
		Name:           in.Name,
		Description:    in.Description,
		DocumentTypeID: docTypeID,
		CategoryID:     in.CategoryID,
		FileID:         fileID,
		PrevFileID:     prevFileID,
		IsActive:       isActive,
		CreatedBy:      &userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.WithContext(ctx).Create(template).Error; err != nil {
		return nil, fmt.Errorf("error creating template: %w", err)
	}

	// Crear notificación
	notifType := "TEMPLATE" // o "DOCUMENT_TEMPLATE", lo que prefieras
	title := "Nueva plantilla creada"
	body := fmt.Sprintf("Se ha creado la plantilla '%s'.", template.Name)

	if err := s.noti.NotifyUser(ctx, userID, title, body, &notifType); err != nil {
		// Aquí decides: ¿si falla la notificación, fallas todo o solo logueas?
		// Por ahora devolvemos el error para verlo en desarrollo:
		return nil, fmt.Errorf("template created but failed to create notification: %w", err)
	}

	return template, nil

}
