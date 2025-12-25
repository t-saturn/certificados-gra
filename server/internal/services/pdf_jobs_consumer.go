package services

import (
	"context"
	"encoding/json"
	"time"

	"server/internal/dto"
	"server/internal/models"
	"server/internal/repositories"
	"server/pkgs/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PdfJobsConsumer struct {
	db      *gorm.DB
	redis   repositories.PdfJobRedisRepository
	enabled bool
}

func NewPdfJobsConsumer(db *gorm.DB, redis repositories.PdfJobRedisRepository) *PdfJobsConsumer {
	return &PdfJobsConsumer{db: db, redis: redis, enabled: true}
}

func (c *PdfJobsConsumer) Run(ctx context.Context) {
	for c.enabled {
		// 1s polling
		msg, err := c.redis.PopDoneMessage(ctx, 1*time.Second)
		if err != nil {
			logger.Log.Error().Err(err).Msg("pdf_jobs_consumer pop done failed")
			continue
		}
		if msg == "" {
			continue
		}

		var done dto.RustJobDoneMessage
		if err := json.Unmarshal([]byte(msg), &done); err != nil {
			logger.Log.Error().Err(err).Str("msg", msg).Msg("pdf_jobs_consumer invalid done message")
			continue
		}

		jobID := done.JobID.String()

		results, _ := c.redis.GetResults(ctx, jobID)
		errors, _ := c.redis.GetErrors(ctx, jobID)

		logger.Log.Info().
			Str("job_id", jobID).
			Int("results", len(results)).
			Int("errors", len(errors)).
			Str("status", done.Status).
			Msg("pdf_jobs_consumer processing job")

		_ = c.persist(ctx, done, results, errors)
	}
}

func (c *PdfJobsConsumer) persist(ctx context.Context, done dto.RustJobDoneMessage, results []string, errs []string) error {
	now := time.Now()

	return c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) aplicar resultados -> document_pdfs + documents.status = PDF_GENERATED
		for _, line := range results {
			item, err := dto.ParseRedisResultLine(line)
			if err != nil {
				logger.Log.Error().Err(err).Str("line", line).Msg("invalid result line")
				continue
			}
			if item.ClientRef == nil {
				continue
			}

			docID, err := uuid.Parse(*item.ClientRef)
			if err != nil {
				continue
			}
			fileID, err := uuid.Parse(item.FileID)
			if err != nil {
				continue
			}

			// crea registro document_pdfs
			pdf := models.DocumentPDF{
				ID:              uuid.New(),
				DocumentID:      docID,
				Stage:           "GENERATED", // ajusta a tu enum/valores
				Version:         1,
				FileID:          fileID,
				FileName:        derefStr(item.FileName),
				FileHash:        derefStr(item.FileHash),
				FileSizeBytes:   item.FileSizeBytes,
				StorageProvider: item.StorageProvider,
				CreatedAt:       now,
			}
			if err := tx.Create(&pdf).Error; err != nil {
				logger.Log.Error().Err(err).Str("doc_id", docID.String()).Msg("insert document_pdfs failed")
			}

			// actualiza documents
			_ = tx.Model(&models.Document{}).
				Where("id = ?", docID).
				Updates(map[string]any{
					"status":     "PDF_GENERATED",
					"updated_at": now,
				}).Error
		}

		// 2) si hay errores, marca docs como PDF_FAILED (al menos a nivel job)
		// Ideal: que errors tenga client_ref para mapear exacto; si no, marca por job_id.
		if done.Status == "FAILED" || len(errs) > 0 || done.Status == "DONE_WITH_ERRORS" {
			_ = tx.Model(&models.Document{}).
				Where("pdf_job_id = ?", done.JobID).
				Where("status = ?", "PDF_QUEUED").
				Updates(map[string]any{
					"status":     "PDF_FAILED",
					"updated_at": now,
				}).Error
		}

		return nil
	})
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
func derefI64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}
