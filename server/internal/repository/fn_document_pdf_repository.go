package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type fnDocumentPDFRepository struct {
	db *gorm.DB
}

// NewFNDocumentPDFRepository creates a new FN document pdf repository
func NewFNDocumentPDFRepository(db *gorm.DB) FNDocumentPDFRepository {
	return &fnDocumentPDFRepository{db: db}
}

func (r *fnDocumentPDFRepository) Create(ctx context.Context, pdf *models.DocumentPDF) error {
	return r.db.WithContext(ctx).Create(pdf).Error
}

func (r *fnDocumentPDFRepository) GetByDocumentID(ctx context.Context, documentID uuid.UUID) ([]models.DocumentPDF, error) {
	var pdfs []models.DocumentPDF
	err := r.db.WithContext(ctx).
		Where("document_id = ?", documentID).
		Order("created_at DESC").
		Find(&pdfs).Error
	return pdfs, err
}

func (r *fnDocumentPDFRepository) GetLatestByDocumentID(ctx context.Context, documentID uuid.UUID) (*models.DocumentPDF, error) {
	var pdf models.DocumentPDF
	err := r.db.WithContext(ctx).
		Where("document_id = ?", documentID).
		Order("created_at DESC").
		First(&pdf).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &pdf, nil
}