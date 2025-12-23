package services

import (
	"context"
	"time"

	"server/internal/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PdfJobFinalizeService interface {
	Tick(ctx context.Context) error
	FinalizeJob(ctx context.Context, pdfJobID uuid.UUID) error
}

type pdfJobFinalizeServiceImpl struct {
	db      *gorm.DB
	docRepo repositories.DocumentPdfFinalizeRepository
	redis   repositories.PdfJobRedisRepository

	batchSize int
}

func NewPdfJobFinalizeService(
	db *gorm.DB,
	docRepo repositories.DocumentPdfFinalizeRepository,
	redisRepo repositories.PdfJobRedisRepository,
	batchSize int,
) PdfJobFinalizeService {
	if batchSize <= 0 {
		batchSize = 50
	}
	return &pdfJobFinalizeServiceImpl{
		db:        db,
		docRepo:   docRepo,
		redis:     redisRepo,
		batchSize: batchSize,
	}
}

// Tick: mira N jobs pendientes y finaliza los que estén DONE / DONE_WITH_ERRORS / FAILED
func (s *pdfJobFinalizeServiceImpl) Tick(ctx context.Context) error {
	jobIDs, err := s.docRepo.ListPendingPdfJobs(ctx, s.batchSize)
	if err != nil {
		return err
	}
	for _, id := range jobIDs {
		_ = s.FinalizeJob(ctx, id) // si uno falla, no detengas el resto
	}
	return nil
}

func (s *pdfJobFinalizeServiceImpl) FinalizeJob(ctx context.Context, pdfJobID uuid.UUID) error {
	rustJobID := pdfJobID.String()

	// lock para no finalizar dos veces
	locked, err := s.redis.AcquireFinalizeLock(ctx, rustJobID, 60*time.Second)
	if err != nil || !locked {
		return err // si !locked, otro proceso lo está haciendo
	}

	meta, err := s.redis.GetMeta(ctx, rustJobID)
	if err != nil {
		return err
	}

	// Si todavía no terminó, no hacemos nada
	switch meta.Status {
	case "DONE", "DONE_WITH_ERRORS", "FAILED":
		// seguimos
	default:
		return nil
	}

	results, err := s.redis.GetResults(ctx, rustJobID)
	if err != nil {
		return err
	}

	// map docID -> result
	type resolved struct {
		docID uuid.UUID
		r     repositories.PdfJobResult
	}
	okList := make([]resolved, 0, len(results))
	okIDs := make([]uuid.UUID, 0, len(results))

	for _, r := range results {
		if r.ClientRef == nil {
			// sin client_ref no podemos mapear al doc => ignóralo (o márcalo error)
			continue
		}
		docID, err := uuid.Parse(*r.ClientRef)
		if err != nil {
			continue
		}
		okList = append(okList, resolved{docID: docID, r: r})
		okIDs = append(okIDs, docID)
	}

	// stage/version convenciones
	const stage = "GENERATED"
	const version = 1

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1) Insert document_pdfs de los OK
		for _, it := range okList {
			// file_id obligatorio
			fileUUID, err := uuid.Parse(it.r.FileID)
			if err != nil {
				// si no puedo parsear, trato como fallo (no insert)
				continue
			}
			fileName := ""
			if it.r.FileName != nil {
				fileName = *it.r.FileName
			}
			fileHash := ""
			if it.r.FileHash != nil {
				fileHash = *it.r.FileHash
			}

			if err := s.docRepo.UpsertDocumentPDF(
				ctx,
				tx,
				it.docID,
				stage,
				version,
				fileName,
				fileUUID,
				fileHash,
				it.r.FileSizeBytes,
				it.r.StorageProvider,
			); err != nil {
				return err
			}
		}

		// 2) Marcar OK como PDF_GENERATED
		if err := s.docRepo.MarkDocumentsGenerated(ctx, tx, okIDs); err != nil {
			return err
		}

		// 3) Marcar el resto del mismo pdf_job_id como PDF_FAILED
		_, err := s.docRepo.MarkDocumentsFailedByPdfJob(ctx, tx, pdfJobID, okIDs)
		return err
	})
}
