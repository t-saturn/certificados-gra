package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type documentTemplateRepository struct {
	db *gorm.DB
}

// NewDocumentTemplateRepository creates a new document template repository
func NewDocumentTemplateRepository(db *gorm.DB) DocumentTemplateRepository {
	return &documentTemplateRepository{db: db}
}

func (r *documentTemplateRepository) Create(ctx context.Context, template *models.DocumentTemplate) error {
	return r.db.WithContext(ctx).Create(template).Error
}

func (r *documentTemplateRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error) {
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
	return &template, err
}

func (r *documentTemplateRepository) GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentTemplate, error) {
	var templates []models.DocumentTemplate
	err := r.db.WithContext(ctx).
		Preload("Category").
		Preload("Fields").
		Where("document_type_id = ?", docTypeID).
		Order("name ASC").
		Find(&templates).Error
	return templates, err
}

func (r *documentTemplateRepository) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentTemplate, error) {
	var templates []models.DocumentTemplate
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		Preload("Fields").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&templates).Error
	return templates, err
}

func (r *documentTemplateRepository) GetAllActive(ctx context.Context) ([]models.DocumentTemplate, error) {
	var templates []models.DocumentTemplate
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Preload("Category").
		Preload("Fields").
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&templates).Error
	return templates, err
}

func (r *documentTemplateRepository) Update(ctx context.Context, template *models.DocumentTemplate) error {
	return r.db.WithContext(ctx).Save(template).Error
}

func (r *documentTemplateRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.DocumentTemplate{}, "id = ?", id).Error
}

func (r *documentTemplateRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.DocumentTemplate{}).Count(&count).Error
	return count, err
}