package repository

import (
	"context"
	"errors"
	"math"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
	"server/internal/dto"
)

type fnDocumentTemplateRepository struct {
	db *gorm.DB
}

// NewFNDocumentTemplateRepository creates a new FN document template repository
func NewFNDocumentTemplateRepository(db *gorm.DB) FNDocumentTemplateRepository {
	return &fnDocumentTemplateRepository{db: db}
}

func (r *fnDocumentTemplateRepository) Create(ctx context.Context, template *models.DocumentTemplate, fields []models.DocumentTemplateField) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(template).Error; err != nil {
			return err
		}

		if len(fields) > 0 {
			// Set template ID for all fields
			for i := range fields {
				fields[i].TemplateID = template.ID
			}
			if err := tx.Create(&fields).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *fnDocumentTemplateRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error) {
	var template models.DocumentTemplate
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		Preload("Fields").
		Preload("User").
		First(&template, "id = ?", id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *fnDocumentTemplateRepository) GetByCode(ctx context.Context, code string) (*models.DocumentTemplate, error) {
	var template models.DocumentTemplate
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		Preload("Fields").
		First(&template, "code = ?", code).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &template, nil
}

func (r *fnDocumentTemplateRepository) List(ctx context.Context, params dto.DocumentTemplateListQuery) ([]models.DocumentTemplate, int64, error) {
	var templates []models.DocumentTemplate
	var total int64

	// Set defaults
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

	query := r.db.WithContext(ctx).Model(&models.DocumentTemplate{})

	// Apply filters
	if params.IsActive != nil {
		query = query.Where("document_templates.is_active = ?", *params.IsActive)
	}

	if params.SearchQuery != nil && strings.TrimSpace(*params.SearchQuery) != "" {
		q := "%" + strings.TrimSpace(*params.SearchQuery) + "%"
		query = query.Where("document_templates.name ILIKE ? OR document_templates.code ILIKE ?", q, q)
	}

	if params.TemplateTypeCode != nil && strings.TrimSpace(*params.TemplateTypeCode) != "" {
		query = query.Joins("JOIN document_types dt ON dt.id = document_templates.document_type_id").
			Where("dt.code = ?", strings.TrimSpace(*params.TemplateTypeCode))
	}

	if params.TemplateCategoryCode != nil && strings.TrimSpace(*params.TemplateCategoryCode) != "" {
		query = query.Joins("LEFT JOIN document_categories dc ON dc.id = document_templates.category_id").
			Where("dc.code = ?", strings.TrimSpace(*params.TemplateCategoryCode))
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.DocumentTemplate{}, 0, nil
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Fetch with preloads
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		Where(query).
		Order("document_templates.created_at DESC, document_templates.id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&templates).Error

	if err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

func (r *fnDocumentTemplateRepository) Update(ctx context.Context, template *models.DocumentTemplate) error {
	return r.db.WithContext(ctx).Save(template).Error
}

func (r *fnDocumentTemplateRepository) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.db.WithContext(ctx).
		Model(&models.DocumentTemplate{}).
		Where("id = ?", id).
		Update("is_active", active).Error
}

func (r *fnDocumentTemplateRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.DocumentTemplate{}, "id = ?", id).Error
}

func (r *fnDocumentTemplateRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.DocumentTemplate{}).
		Where("code = ?", code).
		Count(&count).Error
	return count > 0, err
}

func (r *fnDocumentTemplateRepository) GetDocumentTypeByCode(ctx context.Context, code string) (*models.DocumentType, error) {
	var docType models.DocumentType
	err := r.db.WithContext(ctx).First(&docType, "code = ?", code).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &docType, nil
}

func (r *fnDocumentTemplateRepository) GetCategoryByCodeAndTypeID(ctx context.Context, code string, typeID uuid.UUID) (*models.DocumentCategory, error) {
	var category models.DocumentCategory
	err := r.db.WithContext(ctx).
		Where("code = ? AND document_type_id = ?", code, typeID).
		First(&category).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *fnDocumentTemplateRepository) CountFieldsByTemplateID(ctx context.Context, templateID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.DocumentTemplateField{}).
		Where("template_id = ?", templateID).
		Count(&count).Error
	return count, err
}

// Helper function for pagination calculation
func CalculateTotalPages(total int64, pageSize int) int {
	return int(math.Ceil(float64(total) / float64(pageSize)))
}