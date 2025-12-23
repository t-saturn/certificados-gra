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
			logger.Log.Error().Err(err).Str("raw", raw).Msg("invalid done message")
			continue
		}
		if msg.JobType != dto.RustJobTypeGenerateDocs {
			logger.Log.Debug().
				Str("job_type", msg.JobType).
				Str("job_id", msg.JobID.String()).
				Msg("done message ignored (unknown job type)")
			continue
		}

		jobID := msg.JobID.String()

		results, err := s.redisRepo.GetResults(ctx, jobID)
		if err != nil {
			logger.Log.Error().Err(err).Str("job_id", jobID).Msg("GetResults failed")
			continue
		}

		errorsLines, err := s.redisRepo.GetErrors(ctx, jobID)
		if err != nil {
			logger.Log.Error().Err(err).Str("job_id", jobID).Msg("GetErrors failed")
			continue
		}

		logger.Log.Info().
			Str("job_id", jobID).
			Str("status", msg.Status).
			Int("results", len(results)).
			Int("errors", len(errorsLines)).
			Msg("pdf finalize got job data from redis")

		genRows := make([]repositories.GeneratedPdfRow, 0, len(results))
		genDocIDs := make([]uuid.UUID, 0, len(results))

		// results -> INSERT document_pdfs + mark PDF_GENERATED
		for _, line := range results {
			it, err := dto.ParseRedisResultLine(line)
			if err != nil || it.ClientRef == nil || *it.ClientRef == "" {
				logger.Log.Warn().Err(err).Str("job_id", jobID).Str("line", line).Msg("invalid result line")
				continue
			}

			docID, err := uuid.Parse(*it.ClientRef)
			if err != nil {
				logger.Log.Warn().Err(err).Str("job_id", jobID).Str("client_ref", *it.ClientRef).Msg("invalid client_ref uuid")
				continue
			}

			fileID, err := uuid.Parse(it.FileID)
			if err != nil {
				logger.Log.Warn().Err(err).Str("job_id", jobID).Str("file_id", it.FileID).Msg("invalid file_id uuid")
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

		logger.Log.Info().
			Str("job_id", jobID).
			Int("gen_rows", len(genRows)).
			Int("gen_docs", len(genDocIDs)).
			Msg("pdf finalize parsed redis results")

		// ✅ AQUÍ estaba el bug: ahora sí capturamos el error
		if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := s.finalizeRepo.UpsertGeneratedPDFs(ctx, tx, genRows); err != nil {
				return err
			}
			if err := s.finalizeRepo.MarkDocumentsGenerated(ctx, tx, genDocIDs); err != nil {
				return err
			}
			return nil
		}); err != nil {
			logger.Log.Error().Err(err).Str("job_id", jobID).Msg("pdf finalize transaction failed")
			// importante: no “pierdas” el mensaje. Si quieres reintentos,
			// lo ideal es NO consumirlo hasta que la tx pase.
			continue
		}

		processed++
		logger.Log.Info().Str("job_id", jobID).Msg("pdf finalize processed")
	}

	return nil
}
