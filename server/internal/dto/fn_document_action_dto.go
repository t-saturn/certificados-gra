package dto

import (
	"time"

	"github.com/google/uuid"
)

// -- document status constants

const (
	// lifecycle status
	DocStatusCreated = "CREATED"
	DocStatusRejected = "REJECTED"
	DocStatusRenew    = "RENEW"

	// pdf generation status
	DocStatusPDFPending      = "PDF.PENDING"
	DocStatusPDFDownloading  = "PDF.DOWNLOADING"
	DocStatusPDFDownloaded   = "PDF.DOWNLOADED"
	DocStatusPDFRendering    = "PDF.RENDERING"
	DocStatusPDFRendered     = "PDF.RENDERED"
	DocStatusPDFGeneratingQR = "PDF.GENERATING_QR"
	DocStatusPDFQRGenerated  = "PDF.QR_GENERATED"
	DocStatusPDFInsertingQR  = "PDF.INSERTING_QR"
	DocStatusPDFQRInserted   = "PDF.QR_INSERTED"
	DocStatusPDFUploading    = "PDF.UPLOADING"
	DocStatusPDFCompleted    = "PDF.COMPLETED"
	DocStatusPDFFailed       = "PDF.FAILED"
)

// -- allowed status transitions

var AllowedStatusTransitions = map[string][]string{
	DocStatusCreated:         {DocStatusPDFPending, DocStatusRejected},
	DocStatusRenew:           {DocStatusPDFPending, DocStatusRejected},
	DocStatusPDFPending:      {DocStatusPDFDownloading, DocStatusPDFFailed, DocStatusRejected},
	DocStatusPDFDownloading:  {DocStatusPDFDownloaded, DocStatusPDFFailed},
	DocStatusPDFDownloaded:   {DocStatusPDFRendering, DocStatusPDFFailed},
	DocStatusPDFRendering:    {DocStatusPDFRendered, DocStatusPDFFailed},
	DocStatusPDFRendered:     {DocStatusPDFGeneratingQR, DocStatusPDFFailed},
	DocStatusPDFGeneratingQR: {DocStatusPDFQRGenerated, DocStatusPDFFailed},
	DocStatusPDFQRGenerated:  {DocStatusPDFInsertingQR, DocStatusPDFFailed},
	DocStatusPDFInsertingQR:  {DocStatusPDFQRInserted, DocStatusPDFFailed},
	DocStatusPDFQRInserted:   {DocStatusPDFUploading, DocStatusPDFFailed},
	DocStatusPDFUploading:    {DocStatusPDFCompleted, DocStatusPDFFailed},
	DocStatusPDFCompleted:    {DocStatusRejected, DocStatusRenew},
	DocStatusPDFFailed:       {DocStatusRenew, DocStatusRejected},
	DocStatusRejected:        {DocStatusRenew},
}

// -- request dtos

// DocumentActionRequest represents a request for document actions
type DocumentActionRequest struct {
	Action       string                       `json:"action" validate:"required,oneof=reg_doc sync_doc gen_doc doc_reject doc_renew"`
	EventID      string                       `json:"event_id" validate:"required,uuid"`
	Participants []DocumentActionParticipant  `json:"participants" validate:"required,min=1"`
	QRConfig     *QRConfigRequest             `json:"qr_config,omitempty"`
}

// DocumentActionParticipant represents a participant in document action
type DocumentActionParticipant struct {
	UserDetailID string                 `json:"user_detail_id" validate:"required,uuid"`
	DocumentID   *string                `json:"document_id,omitempty"`
	TemplateData map[string]string      `json:"template_data,omitempty"`
}

// QRConfigRequest represents QR configuration from frontend
type QRConfigRequest struct {
	BaseURL     string  `json:"base_url" validate:"required,url"`
	QRSizeCM    float64 `json:"qr_size_cm" validate:"required,min=0.5,max=10"`
	QRMarginYCM float64 `json:"qr_margin_y_cm" validate:"required,min=0"`
	QRPage      int     `json:"qr_page" validate:"min=0"`
}

// -- response dtos

// DocumentActionResponse represents response for document actions
type DocumentActionResponse struct {
	Action           string                        `json:"action"`
	EventID          uuid.UUID                     `json:"event_id"`
	PDFJobID         *uuid.UUID                    `json:"pdf_job_id,omitempty"`
	TotalParticipants int                          `json:"total_participants"`
	ProcessedCount   int                           `json:"processed_count"`
	FailedCount      int                           `json:"failed_count"`
	Results          []DocumentActionResultItem    `json:"results"`
}

// DocumentActionResultItem represents result for each participant
type DocumentActionResultItem struct {
	UserDetailID uuid.UUID `json:"user_detail_id"`
	DocumentID   uuid.UUID `json:"document_id"`
	SerialCode   string    `json:"serial_code"`
	Status       string    `json:"status"`
	Error        *string   `json:"error,omitempty"`
}

// -- nats event dtos

// PDFBatchRequestEvent represents the event sent to pdf-svc
type PDFBatchRequestEvent struct {
	EventType string              `json:"event_type"`
	Payload   PDFBatchRequestPayload `json:"payload"`
}

// PDFBatchRequestPayload represents the payload for pdf batch request
type PDFBatchRequestPayload struct {
	PDFJobID string               `json:"pdf_job_id"`
	Items    []PDFBatchRequestItem `json:"items"`
}

// PDFBatchRequestItem represents a single item in batch request
type PDFBatchRequestItem struct {
	UserID     string           `json:"user_id"`
	TemplateID string           `json:"template_id"`
	SerialCode string           `json:"serial_code"`
	IsPublic   bool             `json:"is_public"`
	PDF        []PDFKeyValue    `json:"pdf"`
	QR         []PDFKeyValue    `json:"qr"`
	QRPDF      []PDFKeyValue    `json:"qr_pdf"`
}

// PDFKeyValue represents key-value pair for pdf/qr data
type PDFKeyValue struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// PDFBatchCompletedEvent represents the completed event from pdf-svc
type PDFBatchCompletedEvent struct {
	EventType string                    `json:"event_type"`
	Payload   PDFBatchCompletedPayload  `json:"payload"`
}

// PDFBatchCompletedPayload represents the payload of completed event
type PDFBatchCompletedPayload struct {
	PDFJobID        string                     `json:"pdf_job_id"`
	JobID           string                     `json:"job_id"`
	Status          string                     `json:"status"`
	TotalItems      int                        `json:"total_items"`
	SuccessCount    int                        `json:"success_count"`
	FailedCount     int                        `json:"failed_count"`
	Items           []PDFBatchCompletedItem    `json:"items"`
	ProcessingTimeMS int64                     `json:"processing_time_ms"`
}

// PDFBatchCompletedItem represents a single item result
type PDFBatchCompletedItem struct {
	ItemID     string                      `json:"item_id"`
	UserID     string                      `json:"user_id"`
	SerialCode string                      `json:"serial_code"`
	Status     string                      `json:"status"`
	Data       *PDFBatchCompletedItemData  `json:"data,omitempty"`
	Error      *PDFBatchCompletedItemError `json:"error,omitempty"`
}

// PDFBatchCompletedItemData represents successful item data
type PDFBatchCompletedItemData struct {
	FileID           string `json:"file_id"`
	FileName         string `json:"file_name"`
	FileSize         int64  `json:"file_size"`
	FileHash         string `json:"file_hash"`
	MimeType         string `json:"mime_type"`
	IsPublic         bool   `json:"is_public"`
	DownloadURL      string `json:"download_url"`
	ProcessingTimeMS int64  `json:"processing_time_ms"`
}

// PDFBatchCompletedItemError represents failed item error
type PDFBatchCompletedItemError struct {
	UserID  string `json:"user_id"`
	Status  string `json:"status"`
	Message string `json:"message"`
	Stage   string `json:"stage"`
	Code    string `json:"code"`
}

// PDFBatchFailedEvent represents the failed event from pdf-svc
type PDFBatchFailedEvent struct {
	EventType string                 `json:"event_type"`
	Payload   PDFBatchFailedPayload  `json:"payload"`
}

// PDFBatchFailedPayload represents the payload of failed event
type PDFBatchFailedPayload struct {
	PDFJobID string `json:"pdf_job_id"`
	JobID    string `json:"job_id"`
	Status   string `json:"status"`
	Message  string `json:"message"`
	Code     string `json:"code"`
}

// -- document list dto

// DocumentListQuery represents query parameters for listing documents
type DocumentListQuery struct {
	Page        int     `query:"page"`
	PageSize    int     `query:"page_size"`
	SearchQuery *string `query:"q"`
	EventID     *string `query:"event_id"`
	TemplateID  *string `query:"template_id"`
	Status      *string `query:"status"`
}

// DocumentListItem represents a document item in list response
type DocumentListItem struct {
	ID                     uuid.UUID  `json:"id"`
	SerialCode             string     `json:"serial_code"`
	VerificationCode       string     `json:"verification_code"`
	Status                 string     `json:"status"`
	DigitalSignatureStatus string     `json:"digital_signature_status"`
	IssueDate              time.Time  `json:"issue_date"`
	CreatedAt              string     `json:"created_at"`
	UpdatedAt              string     `json:"updated_at"`
	UserDetailID           uuid.UUID  `json:"user_detail_id"`
	UserDetailName         string     `json:"user_detail_name"`
	UserDetailNationalID   string     `json:"user_detail_national_id"`
	EventID                *uuid.UUID `json:"event_id,omitempty"`
	EventTitle             *string    `json:"event_title,omitempty"`
	TemplateID             *uuid.UUID `json:"template_id,omitempty"`
	TemplateName           *string    `json:"template_name,omitempty"`
	PDFJobID               *uuid.UUID `json:"pdf_job_id,omitempty"`
	HasPDF                 bool       `json:"has_pdf"`
}

// DocumentDetailResponse represents detailed document response
type DocumentDetailResponse struct {
	ID                     uuid.UUID                    `json:"id"`
	SerialCode             string                       `json:"serial_code"`
	VerificationCode       string                       `json:"verification_code"`
	Status                 string                       `json:"status"`
	DigitalSignatureStatus string                       `json:"digital_signature_status"`
	RequiredSignatures     int                          `json:"required_signatures"`
	SignedSignatures       int                          `json:"signed_signatures"`
	IssueDate              time.Time                    `json:"issue_date"`
	SignedAt               *time.Time                   `json:"signed_at,omitempty"`
	PDFJobID               *uuid.UUID                   `json:"pdf_job_id,omitempty"`
	CreatedBy              uuid.UUID                    `json:"created_by"`
	CreatedAt              time.Time                    `json:"created_at"`
	UpdatedAt              time.Time                    `json:"updated_at"`
	UserDetail             UserDetailEmbedded           `json:"user_detail"`
	Event                  *EventEmbedded               `json:"event,omitempty"`
	Template               *DocumentTemplateEmbedded    `json:"template,omitempty"`
	PDFs                   []DocumentPDFResponse        `json:"pdfs"`
}

// EventEmbedded represents embedded event info
type EventEmbedded struct {
	ID    uuid.UUID `json:"id"`
	Code  string    `json:"code"`
	Title string    `json:"title"`
}

// DocumentPDFResponse represents a document pdf in response
type DocumentPDFResponse struct {
	ID              uuid.UUID `json:"id"`
	Stage           string    `json:"stage"`
	Version         int       `json:"version"`
	FileName        string    `json:"file_name"`
	FileID          uuid.UUID `json:"file_id"`
	FileHash        string    `json:"file_hash"`
	FileSizeBytes   *int64    `json:"file_size_bytes,omitempty"`
	StorageProvider *string   `json:"storage_provider,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}