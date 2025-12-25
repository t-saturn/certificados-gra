package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentRepository interface {
	AssignPdfJobIDAndQueueStatus(ctx context.Context, tx *gorm.DB, docIDs []uuid.UUID, jobID uuid.UUID) error
}

type documentRepositoryImpl struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) DocumentRepository {
	return &documentRepositoryImpl{db: db}
}

func (r *documentRepositoryImpl) AssignPdfJobIDAndQueueStatus(
	ctx context.Context,
	tx *gorm.DB,
	docIDs []uuid.UUID,
	jobID uuid.UUID,
) error {
	if len(docIDs) == 0 {
		return nil
	}

	now := time.Now()

	return tx.WithContext(ctx).
		Table("documents").
		Where("id IN ?", docIDs).
		Updates(map[string]any{
			"pdf_job_id": jobID,
			"status":     "PDF_QUEUED",
			"updated_at": now,
		}).Error
}
