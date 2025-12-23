package services

import (
	"context"

	"server/internal/dto"
	"server/internal/repositories"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PdfJobService interface {
	EnqueueGenerateDocs(ctx context.Context, req dto.EnqueuePdfJobRequest) (dto.EnqueuePdfJobResponse, error)
}

type pdfJobServiceImpl struct {
	db        *gorm.DB
	docRepo   repositories.DocumentRepository
	queueRepo repositories.PdfJobQueueRepository
	queueName string
}

func NewPdfJobService(
	db *gorm.DB,
	docRepo repositories.DocumentRepository,
	queueRepo repositories.PdfJobQueueRepository,
	queueName string,
) PdfJobService {
	return &pdfJobServiceImpl{
		db:        db,
		docRepo:   docRepo,
		queueRepo: queueRepo,
		queueName: queueName,
	}
}

// payload para Rust (exacto a tu struct)
type rustPdfJobPayload struct {
	JobID   uuid.UUID        `json:"job_id"`
	JobType string           `json:"job_type"`
	EventID uuid.UUID        `json:"event_id"`
	Items   []rustPdfJobItem `json:"items"`
}

type rustPdfJobItem struct {
	ClientRef uuid.UUID         `json:"client_ref"`
	Template  uuid.UUID         `json:"template"`
	UserID    uuid.UUID         `json:"user_id"`
	IsPublic  bool              `json:"is_public"`
	QR        []map[string]any  `json:"qr"`
	QRPdf     []map[string]any  `json:"qr_pdf"`
	PDF       []dto.PdfFieldDTO `json:"pdf"`
}

func (s *pdfJobServiceImpl) EnqueueGenerateDocs(ctx context.Context, req dto.EnqueuePdfJobRequest) (dto.EnqueuePdfJobResponse, error) {
	jobID := uuid.New()

	// preparar ids + payload
	docIDs := make([]uuid.UUID, 0, len(req.Items))
	items := make([]rustPdfJobItem, 0, len(req.Items))

	for _, it := range req.Items {
		docIDs = append(docIDs, it.DocumentID)
		items = append(items, rustPdfJobItem{
			ClientRef: it.DocumentID,
			Template:  it.TemplateID,
			UserID:    it.UserID,
			IsPublic:  it.IsPublic,
			QR:        it.QR,
			QRPdf:     it.QRPdf,
			PDF:       it.PDF,
		})
	}

	payload := rustPdfJobPayload{
		JobID:   jobID,
		JobType: "GENERATE_DOCS",
		EventID: req.EventID,
		Items:   items,
	}

	// ✅ Transacción: 1) marcar docs con pdf_job_id + PDF_QUEUED, 2) encolar a redis
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.docRepo.AssignPdfJobIDAndQueueStatus(ctx, tx, docIDs, jobID); err != nil {
			return err
		}
		if err := s.queueRepo.Enqueue(ctx, s.queueName, payload); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return dto.EnqueuePdfJobResponse{}, err
	}

	return dto.EnqueuePdfJobResponse{
		JobID: jobID.String(),
		Total: len(req.Items),
	}, nil
}
