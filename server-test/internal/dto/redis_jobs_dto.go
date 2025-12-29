package dto

import (
	"encoding/json"

	"github.com/google/uuid"
)

const RustJobTypeGenerateDocs = "GENERATE_DOCS"

/* ---------- Payload exacto para Rust (queue:docs:generate) ---------- */

type RustDocsGenerateJob struct {
	JobID   uuid.UUID         `json:"job_id"`
	JobType string            `json:"job_type"` // "GENERATE_DOCS"
	EventID uuid.UUID         `json:"event_id"`
	Items   []RustDocsJobItem `json:"items"`
}

type RustDocsJobItem struct {
	ClientRef uuid.UUID `json:"client_ref"` // document_id
	Template  uuid.UUID `json:"template"`   // document_templates.file_id (FileServer)
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

/* ---------- Resultado en job:<id>:results ---------- */

type RedisJobResultItem struct {
	ClientRef       *string `json:"client_ref"` // document_id string
	UserID          *string `json:"user_id"`
	FileID          string  `json:"file_id"` // UUID string
	FileName        *string `json:"file_name"`
	FileHash        *string `json:"file_hash"`
	FileSizeBytes   *int64  `json:"file_size_bytes"`
	StorageProvider *string `json:"storage_provider"`
}

func ParseRedisResultLine(line string) (*RedisJobResultItem, error) {
	var out RedisJobResultItem
	if err := json.Unmarshal([]byte(line), &out); err != nil {
		return nil, err
	}
	return &out, nil
}

/* ---------- Mensaje DONE que Rust empuja a queue:docs:generate:done ---------- */

type RustJobDoneMessage struct {
	JobID   uuid.UUID `json:"job_id"`
	EventID uuid.UUID `json:"event_id"`
	JobType string    `json:"job_type"` // "GENERATE_DOCS"
	Status  string    `json:"status"`   // "DONE" | "FAILED"
}
