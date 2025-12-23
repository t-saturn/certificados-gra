package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Esto te devuelve pdf_job_ids únicos que aún están pendientes.
type PendingPdfJobRow struct {
	PDFJobID uuid.UUID `gorm:"column:pdf_job_id"`
}

type DocumentPdfFinalizeRepository interface {
	ListPendingPdfJobs(ctx context.Context, limit int) ([]uuid.UUID, error)
	ListDocumentsByPdfJobID(ctx context.Context, pdfJobID uuid.UUID) ([]uuid.UUID, error)

	UpsertDocumentPDF(
		ctx context.Context,
		tx *gorm.DB,
		documentID uuid.UUID,
		stage string,
		version int,
		fileName string,
		fileID uuid.UUID,
		fileHash string,
		fileSizeBytes *int64,
		storageProvider *string,
	) error

	MarkDocumentsGenerated(ctx context.Context, tx *gorm.DB, documentIDs []uuid.UUID) error
	MarkDocumentsFailedByPdfJob(ctx context.Context, tx *gorm.DB, pdfJobID uuid.UUID, excludeIDs []uuid.UUID) (int64, error)
}

type documentPdfFinalizeRepositoryImpl struct {
	db *gorm.DB
}

func NewDocumentPdfFinalizeRepository(db *gorm.DB) DocumentPdfFinalizeRepository {
	return &documentPdfFinalizeRepositoryImpl{db: db}
}

func (r *documentPdfFinalizeRepositoryImpl) ListPendingPdfJobs(ctx context.Context, limit int) ([]uuid.UUID, error) {
	// Estados pendientes que Go debe mirar (ajusta si usas PDF_GENERATING también)
	statuses := []string{"PDF_QUEUED", "PDF_GENERATING"}

	var rows []PendingPdfJobRow
	err := r.db.WithContext(ctx).
		Table("documents").
		Select("DISTINCT pdf_job_id").
		Where("pdf_job_id IS NOT NULL").
		Where("status IN ?", statuses).
		Order("pdf_job_id").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	out := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.PDFJobID)
	}
	return out, nil
}

func (r *documentPdfFinalizeRepositoryImpl) ListDocumentsByPdfJobID(ctx context.Context, pdfJobID uuid.UUID) ([]uuid.UUID, error) {
	type row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	var rows []row
	err := r.db.WithContext(ctx).
		Table("documents").
		Select("id").
		Where("pdf_job_id = ?", pdfJobID).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]uuid.UUID, 0, len(rows))
	for _, rr := range rows {
		out = append(out, rr.ID)
	}
	return out, nil
}

func (r *documentPdfFinalizeRepositoryImpl) UpsertDocumentPDF(
	ctx context.Context,
	tx *gorm.DB,
	documentID uuid.UUID,
	stage string,
	version int,
	fileName string,
	fileID uuid.UUID,
	fileHash string,
	fileSizeBytes *int64,
	storageProvider *string,
) error {
	// Si quieres evitar duplicados: UNIQUE(document_id, stage, version) en DB sería ideal.
	// Aquí hacemos "insert" simple. Si ya existe, puedes cambiarlo a upsert con clause.OnConflict.
	now := time.Now()

	type DocumentPDFRow struct {
		ID              uuid.UUID  `gorm:"column:id"`
		DocumentID      uuid.UUID  `gorm:"column:document_id"`
		Stage           string     `gorm:"column:stage"`
		Version         int        `gorm:"column:version"`
		FileName        string     `gorm:"column:file_name"`
		FileID          uuid.UUID  `gorm:"column:file_id"`
		FileHash        string     `gorm:"column:file_hash"`
		FileSizeBytes   *int64     `gorm:"column:file_size_bytes"`
		StorageProvider *string    `gorm:"column:storage_provider"`
		CreatedAt       time.Time  `gorm:"column:created_at"`
	}

	row := DocumentPDFRow{
		ID:              uuid.New(),
		DocumentID:      documentID,
		Stage:           stage,
		Version:         version,
		FileName:        fileName,
		FileID:          fileID,
		FileHash:        fileHash,
		FileSizeBytes:   fileSizeBytes,
		StorageProvider: storageProvider,
		CreatedAt:       now,
	}

	return tx.WithContext(ctx).Table("document_pdfs").Create(&row).Error
}

func (r *documentPdfFinalizeRepositoryImpl) MarkDocumentsGenerated(ctx context.Context, tx *gorm.DB, documentIDs []uuid.UUID) error {
	if len(documentIDs) == 0 {
		return nil
	}
	return tx.WithContext(ctx).
		Table("documents").
		Where("id IN ?", documentIDs).
		Updates(map[string]any{
			"status":     "PDF_GENERATED",
			"updated_at": time.Now(),
		}).Error
}

func (r *documentPdfFinalizeRepositoryImpl) MarkDocumentsFailedByPdfJob(ctx context.Context, tx *gorm.DB, pdfJobID uuid.UUID, excludeIDs []uuid.UUID) (int64, error) {
	q := tx.WithContext(ctx).Table("documents").
		Where("pdf_job_id = ?", pdfJobID)

	if len(excludeIDs) > 0 {
		q = q.Where("id NOT IN ?", excludeIDs)
	}

	res := q.Updates(map[string]any{
		"status":     "PDF_FAILED",
		"updated_at": time.Now(),
	})

	return res.RowsAffected, res.Error
}
