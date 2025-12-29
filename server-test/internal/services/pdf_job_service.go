package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/config"
	"server/internal/dto"
	"server/internal/models"
	"server/internal/repositories"
	"server/pkgs/logger"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PdfJobService interface {
	GenerateDocs(ctx context.Context, req dto.EnqueuePdfJobRequest) (*dto.EnqueuePdfJobResponse, error)
}

type pdfJobServiceImpl struct {
	db         *gorm.DB
	queueRepo  repositories.PdfJobQueueRepository
}

func NewPdfJobService(db *gorm.DB, queueRepo repositories.PdfJobQueueRepository) PdfJobService {
	return &pdfJobServiceImpl{db: db, queueRepo: queueRepo}
}

func (s *pdfJobServiceImpl) GenerateDocs(ctx context.Context, req dto.EnqueuePdfJobRequest) (*dto.EnqueuePdfJobResponse, error) {
	if len(req.Items) == 0 {
		return nil, fmt.Errorf("items empty")
	}

	// map template_id (DB) -> file_id (FileServer)
	type row struct {
		ID     uuid.UUID
		FileID uuid.UUID
	}
	uniq := map[uuid.UUID]struct{}{}
	for _, it := range req.Items {
		if it.TemplateID == uuid.Nil {
			return nil, fmt.Errorf("template_id missing in item")
		}
		uniq[it.TemplateID] = struct{}{}
	}

	templateIDs := make([]uuid.UUID, 0, len(uniq))
	for id := range uniq {
		templateIDs = append(templateIDs, id)
	}

	var rows []row
	if err := s.db.WithContext(ctx).
		Table("document_templates").
		Select("id, file_id").
		Where("id IN ?", templateIDs).
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	fileByTemplate := map[uuid.UUID]uuid.UUID{}
	for _, r := range rows {
		fileByTemplate[r.ID] = r.FileID
	}

	job := dto.RustDocsGenerateJob{
		JobID:   uuid.New(),
		JobType: dto.RustJobTypeGenerateDocs,
		EventID: req.EventID,
		Items:   make([]dto.RustDocsJobItem, 0, len(req.Items)),
	}

	for _, it := range req.Items {
		fileID, ok := fileByTemplate[it.TemplateID]
		if !ok {
			return nil, fmt.Errorf("template_id not found: %s", it.TemplateID)
		}
		fields := make([]dto.PdfField, 0, len(it.PDF))
		for _, f := range it.PDF {
			fields = append(fields, dto.PdfField{Key: f.Key, Value: f.Value})
		}

		job.Items = append(job.Items, dto.RustDocsJobItem{
			ClientRef: it.DocumentID,
			Template:  fileID,
			UserID:    it.UserID,
			IsPublic:  it.IsPublic,
			QR:        it.QR,
			QRPdf:     it.QRPdf,
			PDF:       fields,
		})
	}

	cfg := config.GetConfig()
	if err := s.queueRepo.EnqueueGenerateDocs(ctx, job, cfg.REDISJobTTLSeconds); err != nil {
		return nil, err
	}

	// Marcar docs con PDF_QUEUED + pdf_job_id
	docIDs := make([]uuid.UUID, 0, len(job.Items))
	for _, it := range job.Items {
		docIDs = append(docIDs, it.ClientRef)
	}
	now := time.Now()
	_ = s.db.WithContext(ctx).Model(&models.Document{}).
		Where("id IN ?", docIDs).
		Updates(map[string]any{
			"status":     "PDF_QUEUED",
			"pdf_job_id": job.JobID,
			"updated_at": now,
		}).Error

	logger.Log.Info().
		Str("job_id", job.JobID.String()).
		Int("total", len(job.Items)).
		Msg("queued docs job via pdf-job-service")

	return &dto.EnqueuePdfJobResponse{JobID: job.JobID.String(), Total: len(job.Items)}, nil
}
