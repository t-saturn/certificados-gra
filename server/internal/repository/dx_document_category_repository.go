package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type documentCategoryRepository struct {
	db *gorm.DB
}

// NewDocumentCategoryRepository creates a new document category repository
func NewDocumentCategoryRepository(db *gorm.DB) DocumentCategoryRepository {
	return &documentCategoryRepository{db: db}
}

func (r *documentCategoryRepository) Create(ctx context.Context, category *models.DocumentCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *documentCategoryRepository) GetByID(ctx context.Context, id uint) (*models.DocumentCategory, error) {
	var category models.DocumentCategory
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		First(&category, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &category, err
}

func (r *documentCategoryRepository) GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentCategory, error) {
	var categories []models.DocumentCategory
	err := r.db.WithContext(ctx).
		Where("document_type_id = ?", docTypeID).
		Order("name ASC").
		Find(&categories).Error
	return categories, err
}

func (r *documentCategoryRepository) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentCategory, error) {
	var categories []models.DocumentCategory
	err := r.db.WithContext(ctx).
		Preload("DocumentType").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&categories).Error
	return categories, err
}

func (r *documentCategoryRepository) Update(ctx context.Context, category *models.DocumentCategory) error {
	return r.db.WithContext(ctx).Save(category).Error
}

func (r *documentCategoryRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.DocumentCategory{}, "id = ?", id).Error
}

func (r *documentCategoryRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.DocumentCategory{}).Count(&count).Error
	return count, err
}