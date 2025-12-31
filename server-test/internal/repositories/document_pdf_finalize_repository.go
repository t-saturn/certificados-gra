package repositories

import (
	"context"
	"fmt"
	"time"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GeneratedPdfRow struct {
	DocumentID       uuid.UUID
	FileID           uuid.UUID
	FileName         string
	FileHash         string
	FileSizeBytes    *int64
	StorageProvider  *string
	CreatedAt        time.Time
}

type DocumentPdfFinalizeRepository interface {
	UpsertGeneratedPDFs(ctx context.Context, tx *gorm.DB, rows []GeneratedPdfRow) error
	MarkDocumentsGenerated(ctx context.Context, tx *gorm.DB, docIDs []uuid.UUID) error
	MarkDocumentsFailed(ctx context.Context, tx *gorm.DB, docIDs []uuid.UUID) error
}

type documentPdfFinalizeRepositoryImpl struct {
	db *gorm.DB
}

func NewDocumentPdfFinalizeRepository(db *gorm.DB) DocumentPdfFinalizeRepository {
	return &documentPdfFinalizeRepositoryImpl{db: db}
}

func (r *documentPdfFinalizeRepositoryImpl) UpsertGeneratedPDFs(ctx context.Context, tx *gorm.DB, rows []GeneratedPdfRow) error {
	for _, row := range rows {
		var count int64
		if err := tx.WithContext(ctx).
			Model(&models.DocumentPDF{}).
			Where("document_id = ? AND file_id = ? AND stage = ?", row.DocumentID, row.FileID, "GENERATED").
			Count(&count).Error; err != nil {
			return err
		}

		if count > 0 {
			continue
		}

		var maxV int64
		_ = tx.WithContext(ctx).
			Model(&models.DocumentPDF{}).
			Select("COALESCE(MAX(version),0)").
			Where("document_id = ? AND stage = ?", row.DocumentID, "GENERATED").
			Scan(&maxV).Error

		p := models.DocumentPDF{
			ID:              uuid.New(),
			DocumentID:       row.DocumentID,
			Stage:            "GENERATED",
			Version:          int(maxV) + 1,
			FileName:         row.FileName,
			FileID:           row.FileID,
			FileHash:         row.FileHash,
			FileSizeBytes:    row.FileSizeBytes,
			StorageProvider:  row.StorageProvider,
			CreatedAt:        row.CreatedAt,
		}

		if err := tx.WithContext(ctx).Create(&p).Error; err != nil {
			return fmt.Errorf("insert document_pdfs failed: %w", err)
		}
	}
	return nil
}

func (r *documentPdfFinalizeRepositoryImpl) MarkDocumentsGenerated(ctx context.Context, tx *gorm.DB, docIDs []uuid.UUID) error {
	if len(docIDs) == 0 {
		return nil
	}
	now := time.Now()
	return tx.WithContext(ctx).
		Model(&models.Document{}).
		Where("id IN ?", docIDs).
		Updates(map[string]any{
			"status":     "PDF_GENERATED",
			"updated_at": now,
		}).Error
}

func (r *documentPdfFinalizeRepositoryImpl) MarkDocumentsFailed(ctx context.Context, tx *gorm.DB, docIDs []uuid.UUID) error {
	if len(docIDs) == 0 {
		return nil
	}
	now := time.Now()
	return tx.WithContext(ctx).
		Model(&models.Document{}).
		Where("id IN ?", docIDs).
		Updates(map[string]any{
			"status":     "PDF_FAILED",
			"updated_at": now,
		}).Error
}
