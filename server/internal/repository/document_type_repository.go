package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type documentTypeRepository struct {
	db *gorm.DB
}

// NewDocumentTypeRepository creates a new document type repository
func NewDocumentTypeRepository(db *gorm.DB) DocumentTypeRepository {
	return &documentTypeRepository{db: db}
}

func (r *documentTypeRepository) Create(ctx context.Context, docType *models.DocumentType) error {
	return r.db.WithContext(ctx).Create(docType).Error
}

func (r *documentTypeRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentType, error) {
	var docType models.DocumentType
	err := r.db.WithContext(ctx).Preload("Categories").First(&docType, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &docType, err
}

func (r *documentTypeRepository) GetByCode(ctx context.Context, code string) (*models.DocumentType, error) {
	var docType models.DocumentType
	err := r.db.WithContext(ctx).Preload("Categories").First(&docType, "code = ?", code).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &docType, err
}

func (r *documentTypeRepository) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentType, error) {
	var docTypes []models.DocumentType
	err := r.db.WithContext(ctx).
		Preload("Categories").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&docTypes).Error
	return docTypes, err
}

func (r *documentTypeRepository) GetAllActive(ctx context.Context) ([]models.DocumentType, error) {
	var docTypes []models.DocumentType
	err := r.db.WithContext(ctx).
		Preload("Categories", "is_active = ?", true).
		Where("is_active = ?", true).
		Order("name ASC").
		Find(&docTypes).Error
	return docTypes, err
}

func (r *documentTypeRepository) Update(ctx context.Context, docType *models.DocumentType) error {
	return r.db.WithContext(ctx).Save(docType).Error
}

func (r *documentTypeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.DocumentType{}, "id = ?", id).Error
}

func (r *documentTypeRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.DocumentType{}).Count(&count).Error
	return count, err
}
