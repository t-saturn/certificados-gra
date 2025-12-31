package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type documentRepository struct {
	db *gorm.DB
}

// NewDocumentRepository creates a new document repository
func NewDocumentRepository(db *gorm.DB) DocumentRepository {
	return &documentRepository{db: db}
}

func (r *documentRepository) Create(ctx context.Context, doc *models.Document) error {
	return r.db.WithContext(ctx).Create(doc).Error
}

func (r *documentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Template").
		Preload("PDFs").
		First(&doc, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &doc, err
}

func (r *documentRepository) GetBySerialCode(ctx context.Context, serialCode string) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		First(&doc, "serial_code = ?", serialCode).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &doc, err
}

func (r *documentRepository) GetByVerificationCode(ctx context.Context, verificationCode string) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		First(&doc, "verification_code = ?", verificationCode).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &doc, err
}

func (r *documentRepository) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.Document, error) {
	var docs []models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Where("event_id = ?", eventID).
		Order("created_at DESC").
		Find(&docs).Error
	return docs, err
}

func (r *documentRepository) GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.Document, error) {
	var docs []models.Document
	err := r.db.WithContext(ctx).
		Preload("Event").
		Preload("Template").
		Where("user_detail_id = ?", userDetailID).
		Order("created_at DESC").
		Find(&docs).Error
	return docs, err
}

func (r *documentRepository) GetAll(ctx context.Context, limit, offset int) ([]models.Document, error) {
	var docs []models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&docs).Error
	return docs, err
}

func (r *documentRepository) Update(ctx context.Context, doc *models.Document) error {
	return r.db.WithContext(ctx).Save(doc).Error
}

func (r *documentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Document{}, "id = ?", id).Error
}

func (r *documentRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Document{}).Count(&count).Error
	return count, err
}
