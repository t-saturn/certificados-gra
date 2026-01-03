package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
	"server/internal/dto"
)

type fnDocumentRepository struct {
	db *gorm.DB
}

// NewFNDocumentRepository creates a new FN document repository
func NewFNDocumentRepository(db *gorm.DB) FNDocumentRepository {
	return &fnDocumentRepository{db: db}
}

func (r *fnDocumentRepository) Create(ctx context.Context, doc *models.Document) error {
	return r.db.WithContext(ctx).Create(doc).Error
}

func (r *fnDocumentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Template").
		Preload("PDFs", func(db *gorm.DB) *gorm.DB {
			return db.Order("document_pdfs.created_at DESC")
		}).
		First(&doc, "id = ?", id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *fnDocumentRepository) GetBySerialCode(ctx context.Context, serialCode string) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Template").
		Preload("PDFs").
		First(&doc, "serial_code = ?", serialCode).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *fnDocumentRepository) GetByEventAndUserDetail(ctx context.Context, eventID, userDetailID uuid.UUID) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Where("event_id = ? AND user_detail_id = ?", eventID, userDetailID).
		First(&doc).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *fnDocumentRepository) List(ctx context.Context, params dto.DocumentListQuery) ([]models.Document, int64, error) {
	var docs []models.Document
	var total int64

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

	query := r.db.WithContext(ctx).Model(&models.Document{})

	if params.EventID != nil && *params.EventID != "" {
		eventID, err := uuid.Parse(*params.EventID)
		if err == nil {
			query = query.Where("documents.event_id = ?", eventID)
		}
	}

	if params.TemplateID != nil && *params.TemplateID != "" {
		templateID, err := uuid.Parse(*params.TemplateID)
		if err == nil {
			query = query.Where("documents.template_id = ?", templateID)
		}
	}

	if params.Status != nil && *params.Status != "" {
		query = query.Where("documents.status = ?", *params.Status)
	}

	if params.SearchQuery != nil && strings.TrimSpace(*params.SearchQuery) != "" {
		q := "%" + strings.TrimSpace(*params.SearchQuery) + "%"
		query = query.
			Joins("LEFT JOIN user_details ud ON ud.id = documents.user_detail_id").
			Where("documents.serial_code ILIKE ? OR ud.first_name ILIKE ? OR ud.last_name ILIKE ? OR ud.national_id ILIKE ?", q, q, q, q)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.Document{}, 0, nil
	}

	offset := (page - 1) * pageSize

	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Preload("Event").
		Preload("Template").
		Where(query).
		Order("documents.created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&docs).Error

	if err != nil {
		return nil, 0, err
	}

	return docs, total, nil
}

func (r *fnDocumentRepository) Update(ctx context.Context, doc *models.Document) error {
	return r.db.WithContext(ctx).Save(doc).Error
}

func (r *fnDocumentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now().UTC(),
		}).Error
}

func (r *fnDocumentRepository) UpdatePDFJobID(ctx context.Context, id uuid.UUID, pdfJobID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"pdf_job_id": pdfJobID,
			"updated_at": time.Now().UTC(),
		}).Error
}

func (r *fnDocumentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Document{}, "id = ?", id).Error
}

func (r *fnDocumentRepository) GetNextSerialNumber(ctx context.Context, prefix string) (int64, error) {
	var maxSerial int64
	
	pattern := prefix + "%"
	
	err := r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("serial_code LIKE ?", pattern).
		Select("COALESCE(MAX(CAST(SUBSTRING(serial_code FROM '[0-9]+$') AS BIGINT)), 0)").
		Scan(&maxSerial).Error

	if err != nil {
		return 0, err
	}

	return maxSerial + 1, nil
}

func (r *fnDocumentRepository) GetDocumentsByPDFJobID(ctx context.Context, pdfJobID uuid.UUID) ([]models.Document, error) {
	var docs []models.Document
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Where("pdf_job_id = ?", pdfJobID).
		Find(&docs).Error
	return docs, err
}

func (r *fnDocumentRepository) GetDocumentByUserIDAndPDFJobID(ctx context.Context, userDetailID, pdfJobID uuid.UUID) (*models.Document, error) {
	var doc models.Document
	err := r.db.WithContext(ctx).
		Where("user_detail_id = ? AND pdf_job_id = ?", userDetailID, pdfJobID).
		First(&doc).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &doc, nil
}

func (r *fnDocumentRepository) BulkUpdateStatus(ctx context.Context, ids []uuid.UUID, status string) error {
	if len(ids) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("id IN ?", ids).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now().UTC(),
		}).Error
}