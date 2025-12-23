package services

import (
	"context"
	"encoding/json"
	"time"

	"server/internal/dto"
	"server/internal/repositories"
	"server/pkgs/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PdfJobFinalizeService interface {
	RunOnce(ctx context.Context) error
}

type pdfJobFinalizeServiceImpl struct {
	db           *gorm.DB
	finalizeRepo repositories.DocumentPdfFinalizeRepository
	redisRepo    repositories.PdfJobRedisRepository
	maxPerTick   int
}

func NewPdfJobFinalizeService(
	db *gorm.DB,
	finalizeRepo repositories.DocumentPdfFinalizeRepository,
	redisRepo repositories.PdfJobRedisRepository,
	maxPerTick int,
) PdfJobFinalizeService {
	return &pdfJobFinalizeServiceImpl{
		db:           db,
		finalizeRepo: finalizeRepo,
		redisRepo:    redisRepo,
		maxPerTick:   maxPerTick,
	}
}

func (s *pdfJobFinalizeServiceImpl) RunOnce(ctx context.Context) error {
	processed := 0

	for processed < s.maxPerTick {
		raw, err := s.redisRepo.PopDoneMessage(ctx, 1*time.Second)
		if err != nil {
			return err
		}
		if raw == "" {
			// no hubo mensaje
			break
		}

		var msg dto.RustJobDoneMessage
		if err := json.Unmarshal([]byte(raw), &msg); err != nil {
			logger.Log.Error().Err(err).Msg("invalid done message")
			continue
		}
		if msg.JobType != dto.RustJobTypeGenerateDocs {
			continue
		}

		jobID := msg.JobID

		results, _ := s.redisRepo.GetResults(ctx, jobID.String())
		errorsLines, _ := s.redisRepo.GetErrors(ctx, jobID.String())

		genRows := make([]repositories.GeneratedPdfRow, 0, len(results))
		genDocIDs := make([]uuid.UUID, 0, len(results))
		failDocIDs := make([]uuid.UUID, 0, len(errorsLines))

		// results -> INSERT document_pdfs + mark PDF_GENERATED
		for _, line := range results {
			it, err := dto.ParseRedisResultLine(line)
			if err != nil || it.ClientRef == nil || *it.ClientRef == "" {
				continue
			}
			docID, err := uuid.Parse(*it.ClientRef)
			if err != nil {
				continue
			}
			fileID, err := uuid.Parse(it.FileID)
			if err != nil {
				continue
			}

			fileName := ""
			if it.FileName != nil {
				fileName = *it.FileName
			}
			fileHash := ""
			if it.FileHash != nil {
				fileHash = *it.FileHash
			}

			genRows = append(genRows, repositories.GeneratedPdfRow{
				DocumentID:      docID,
				FileID:          fileID,
				FileName:        fileName,
				FileHash:        fileHash,
				FileSizeBytes:   it.FileSizeBytes,
				StorageProvider: it.StorageProvider,
				CreatedAt:       time.Now(),
			})
			genDocIDs = append(genDocIDs, docID)
		}

		// errors -> mark PDF_FAILED (ideal: errors con client_ref)
		for _, line := range errorsLines {
			it, err := dto.ParseRedisResultLine(line)
			if err != nil || it.ClientRef == nil || *it.ClientRef == "" {
				continue
			}
			docID, err := uuid.Parse(*it.ClientRef)
			if err != nil {
				continue
			}
			failDocIDs = append(failDocIDs, docID)
		}

		_ = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := s.finalizeRepo.UpsertGeneratedPDFs(ctx, tx, genRows); err != nil {
				return err
			}
			if err := s.finalizeRepo.MarkDocumentsGenerated(ctx, tx, genDocIDs); err != nil {
				return err
			}
			// no sobre-escribir generados
			if err := s.finalizeRepo.MarkDocumentsFailed(ctx, tx, failDocIDs); err != nil {
				return err
			}
			return nil
		})

		processed++
		logger.Log.Info().Str("job_id", jobID.String()).Msg("pdf finalize processed")
	}

	return nil
}
