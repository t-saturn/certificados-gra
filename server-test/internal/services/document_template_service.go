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

type DocumentTemplateService interface {
	CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.DocumentTemplateCreateRequest) error
	ListTemplates(ctx context.Context, params dto.DocumentTemplateListQuery) (*dto.DocumentTemplateListResponse, error)
	UpdateTemplate(ctx context.Context, id uuid.UUID, in dto.DocumentTemplateUpdateRequest) error
	DisableTemplate(ctx context.Context, id uuid.UUID) error
	EnableTemplate(ctx context.Context, id uuid.UUID) error
}

type documentTemplateServiceImpl struct {
	db *gorm.DB
}

func NewDocumentTemplateService(db *gorm.DB) DocumentTemplateService {
	return &documentTemplateServiceImpl{db: db}
}

func (s *documentTemplateServiceImpl) CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.DocumentTemplateCreateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	code := strings.TrimSpace(in.Code)
	if code == "" {
		return fmt.Errorf("template code is required")
	}

	// unicidad de code
	var existing models.DocumentTemplate
	if err := s.db.WithContext(ctx).Where("code = ?", code).First(&existing).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("error checking existing document template code: %w", err)
		}
	} else {
		return fmt.Errorf("document template with code '%s' already exists", code)
	}

	// doc type
	var docType models.DocumentType
	if err := s.db.WithContext(ctx).Where("code = ?", in.DocTypeCode).First(&docType).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document type with code '%s' not found", in.DocTypeCode)
		}
		return fmt.Errorf("error fetching document type: %w", err)
	}

	// categoría opcional
	var categoryID *uint
	if in.DocCategoryCode != nil && strings.TrimSpace(*in.DocCategoryCode) != "" {
		catCode := strings.TrimSpace(*in.DocCategoryCode)
		var category models.DocumentCategory
		if err := s.db.WithContext(ctx).
			Where("code = ? AND document_type_id = ?", catCode, docType.ID).
			First(&category).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return fmt.Errorf("document category with code '%s' not found for document type '%s'", catCode, in.DocTypeCode)
			}
			return fmt.Errorf("error fetching document category: %w", err)
		}
		categoryID = &category.ID
	}

	// UUIDs
	fileID, err := uuid.Parse(in.FileID)
	if err != nil {
		return fmt.Errorf("invalid file_id")
	}
	prevFileID, err := uuid.Parse(in.PrevFileID)
	if err != nil {
		return fmt.Errorf("invalid prev_file_id")
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	// Transacción: template + fields
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		template := models.DocumentTemplate{
			DocumentTypeID: docType.ID,
			CategoryID:     categoryID,
			Code:           code,
			Name:           in.Name,
			FileID:         fileID,
			PrevFileID:     prevFileID,
			IsActive:       isActive,
			CreatedBy:      &userID,
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		if err := tx.Create(&template).Error; err != nil {
			return fmt.Errorf("error creating document template: %w", err)
		}

		// Crear fields si vinieron en request
		if len(in.Fields) > 0 {
			fields := make([]models.DocumentTemplateField, 0, len(in.Fields))

			seen := map[string]struct{}{} // evitar duplicados en el mismo request

			for _, f := range in.Fields {
				key := strings.TrimSpace(f.Key)
				if key == "" {
					return fmt.Errorf("field key is required")
				}
				if _, ok := seen[key]; ok {
					return fmt.Errorf("duplicated field key in request: '%s'", key)
				}
				seen[key] = struct{}{}

				label := strings.TrimSpace(f.Label)
				if label == "" {
					return fmt.Errorf("field label is required for key '%s'", key)
				}

				ft := "text"
				if f.FieldType != nil && strings.TrimSpace(*f.FieldType) != "" {
					ft = strings.TrimSpace(*f.FieldType)
				}

				req := false
				if f.Required != nil {
					req = *f.Required
				}

				fields = append(fields, models.DocumentTemplateField{
					TemplateID: template.ID,
					Key:        key,
					Label:      label,
					FieldType:  ft,
					Required:   req,
					CreatedAt:  now,
					UpdatedAt:  now,
				})
			}

			if err := tx.Create(&fields).Error; err != nil {
				return fmt.Errorf("error creating document template fields: %w", err)
			}
		}

		return nil
	})
}

func (s *documentTemplateServiceImpl) ListTemplates(ctx context.Context, params dto.DocumentTemplateListQuery) (*dto.DocumentTemplateListResponse, error) {
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

	query := s.db.WithContext(ctx).
		Model(&models.DocumentTemplate{}).
		Preload("DocumentType").
		Preload("Category")

	// filtro por is_active (ya viene con default=true desde el handler)
	if params.IsActive != nil {
		query = query.Where("document_templates.is_active = ?", *params.IsActive)
	}

	if params.SearchQuery != nil && strings.TrimSpace(*params.SearchQuery) != "" {
		q := "%" + strings.TrimSpace(*params.SearchQuery) + "%"
		query = query.Where("document_templates.name ILIKE ?", q)
	}

	if params.TemplateTypeCode != nil && strings.TrimSpace(*params.TemplateTypeCode) != "" {
		query = query.Joins("JOIN document_types dt ON dt.id = document_templates.document_type_id").
			Where("dt.code = ?", strings.TrimSpace(*params.TemplateTypeCode))
	}

	if params.TemplateCategoryCode != nil && strings.TrimSpace(*params.TemplateCategoryCode) != "" {
		query = query.Joins("LEFT JOIN document_categories dc ON dc.id = document_templates.category_id").
			Where("dc.code = ?", strings.TrimSpace(*params.TemplateCategoryCode))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("error counting document templates: %w", err)
	}

	if total == 0 {
		return &dto.DocumentTemplateListResponse{
			Items: []dto.DocumentTemplateListItem{},
			Pagination: dto.DocumentTemplatePagination{
				Page:        page,
				PageSize:    pageSize,
				TotalItems:  0,
				TotalPages:  0,
				HasPrevPage: page > 1,
				HasNextPage: false,
			},
			Filters: dto.DocumentTemplateListFilters{
				SearchQuery:          params.SearchQuery,
				IsActive:             params.IsActive,
				TemplateTypeCode:     params.TemplateTypeCode,
				TemplateCategoryCode: params.TemplateCategoryCode,
			},
		}, nil
	}

	offset := (page - 1) * pageSize

	var templates []models.DocumentTemplate
	if err := query.
		Order("document_templates.created_at DESC, document_templates.id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&templates).Error; err != nil {
		return nil, fmt.Errorf("error listing document templates: %w", err)
	}

	items := make([]dto.DocumentTemplateListItem, 0, len(templates))
	for _, t := range templates {
		item := dto.DocumentTemplateListItem{
			ID:               t.ID,
			Code:             t.Code,
			Name:             t.Name,
			FileID:           t.FileID.String(),
			PrevFileID:       t.PrevFileID.String(),
			IsActive:         t.IsActive,
			CreatedAt:        t.CreatedAt.Format(time.RFC3339),
			UpdatedAt:        t.UpdatedAt.Format(time.RFC3339),
			DocumentTypeID:   t.DocumentTypeID,
			DocumentTypeCode: t.DocumentType.Code,
			DocumentTypeName: t.DocumentType.Name,
		}

		if t.CategoryID != nil {
			item.CategoryID = t.CategoryID
		}
		if t.Category != nil {
			item.CategoryName = &t.Category.Name
			item.CategoryCode = &t.Category.Code
		}

		items = append(items, item)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	hasNext := page < totalPages
	hasPrev := page > 1

	resp := &dto.DocumentTemplateListResponse{
		Items: items,
		Pagination: dto.DocumentTemplatePagination{
			Page:        page,
			PageSize:    pageSize,
			TotalItems:  int(total),
			TotalPages:  totalPages,
			HasPrevPage: hasPrev,
			HasNextPage: hasNext,
		},
		Filters: dto.DocumentTemplateListFilters{
			SearchQuery:          params.SearchQuery,
			IsActive:             params.IsActive,
			TemplateTypeCode:     params.TemplateTypeCode,
			TemplateCategoryCode: params.TemplateCategoryCode,
		},
	}

	return resp, nil
}

func (s *documentTemplateServiceImpl) UpdateTemplate(ctx context.Context, id uuid.UUID, in dto.DocumentTemplateUpdateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var template models.DocumentTemplate
	if err := s.db.WithContext(ctx).First(&template, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document template not found")
		}
		return fmt.Errorf("error fetching document template: %w", err)
	}

	if in.Code != nil {
		template.Code = *in.Code
	}
	if in.Name != nil {
		template.Name = *in.Name
	}
	if in.FileID != nil {
		if *in.FileID == "" {
			return fmt.Errorf("invalid file_id")
		}
		fileID, err := uuid.Parse(*in.FileID)
		if err != nil {
			return fmt.Errorf("invalid file_id")
		}
		template.FileID = fileID
	}
	if in.PrevFileID != nil {
		if *in.PrevFileID == "" {
			return fmt.Errorf("invalid prev_file_id")
		}
		prevFileID, err := uuid.Parse(*in.PrevFileID)
		if err != nil {
			return fmt.Errorf("invalid prev_file_id")
		}
		template.PrevFileID = prevFileID
	}
	if in.IsActive != nil {
		template.IsActive = *in.IsActive
	}

	template.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&template).Error; err != nil {
		return fmt.Errorf("error updating document template: %w", err)
	}

	return nil
}

func (s *documentTemplateServiceImpl) setTemplateActive(ctx context.Context, id uuid.UUID, active bool) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var template models.DocumentTemplate
	if err := s.db.WithContext(ctx).
		First(&template, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document template not found")
		}
		return fmt.Errorf("error fetching document template: %w", err)
	}

	template.IsActive = active
	template.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&template).Error; err != nil {
		return fmt.Errorf("error updating document template active state: %w", err)
	}

	return nil
}

func (s *documentTemplateServiceImpl) DisableTemplate(ctx context.Context, id uuid.UUID) error {
	return s.setTemplateActive(ctx, id, false)
}

func (s *documentTemplateServiceImpl) EnableTemplate(ctx context.Context, id uuid.UUID) error {
	return s.setTemplateActive(ctx, id, true)
}
