package dto

import "github.com/google/uuid"

// POST /pdf-jobs/generate-docs
type EnqueuePdfJobRequest struct {
	EventID uuid.UUID                  `json:"event_id"`
	Items   []EnqueuePdfJobRequestItem `json:"items"`
}

type EnqueuePdfJobRequestItem struct {
	DocumentID uuid.UUID        `json:"document_id"`
	TemplateID uuid.UUID        `json:"template_id"` // document_templates.id (DB)
	UserID     uuid.UUID        `json:"user_id"`     // user_detail_id
	IsPublic   bool             `json:"is_public"`
	QR         []map[string]any `json:"qr"`
	QRPdf      []map[string]any `json:"qr_pdf"`
	PDF        []PdfFieldDTO    `json:"pdf"`
}

type PdfFieldDTO struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type EnqueuePdfJobResponse struct {
	JobID string `json:"job_id"`
	Total int    `json:"total"`
}
