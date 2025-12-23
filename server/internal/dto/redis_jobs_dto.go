package dto

import (
	"github.com/google/uuid"
)

type DocsGenerateJob struct {
	JobID   uuid.UUID `json:"job_id"`
	JobType string    `json:"job_type"` // "GENERATE_DOCS"
	EventID uuid.UUID `json:"event_id"`
	Items   []DocItem `json:"items"`
}

type DocItem struct {
	ClientRef uuid.UUID `json:"client_ref"` // document_id
	Template  uuid.UUID `json:"template"`   // document_templates.file_id (NO template_id)
	UserID    uuid.UUID `json:"user_id"`    // user_detail_id
	IsPublic  bool      `json:"is_public"`

	QR    []map[string]any `json:"qr"`
	QRPdf []map[string]any `json:"qr_pdf"`

	PDF []PdfField `json:"pdf"`
}

type PdfField struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
