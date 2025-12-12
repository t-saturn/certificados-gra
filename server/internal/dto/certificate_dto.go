package dto

import "github.com/google/uuid"

// ----------- QUERY INPUT -----------

type ListCertificatesQuery struct {
	SearchQuery     string
	SignatureStatus string // PENDING | PARTIALLY_SIGNED | SIGNED | ERROR | all
	EventID         *uuid.UUID
	Page            int
	PageSize        int
	UserID          *uuid.UUID // opcional: filtrar por usuario (usando national_id -> user_details)
}

// ----------- LIST RESPONSE -----------

type CertificateParticipant struct {
	ID         uuid.UUID `json:"id"`
	NationalID string    `json:"national_id"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	FullName   string    `json:"full_name"`
}

type CertificateEventSummary struct {
	ID    *uuid.UUID `json:"id,omitempty"`
	Code  *string    `json:"code,omitempty"`
	Title *string    `json:"title,omitempty"`
}

type CertificateListItem struct {
	ID               uuid.UUID               `json:"id"`
	SerialCode       string                  `json:"serial_code"`
	VerificationCode string                  `json:"verification_code"`
	Status           string                  `json:"status"`              // Document.Status: ISSUED, ANNULLED, etc.
	SignatureStatus  string                  `json:"signature_status"`    // Document.DigitalSignatureStatus
	StateLabel       string                  `json:"state_label"`         // "PENDIENTE" | "LISTO" | etc (derivado)
	IssueDate        string                  `json:"issue_date"`          // ISO
	SignedAt         *string                 `json:"signed_at,omitempty"` // ISO
	Event            CertificateEventSummary `json:"event"`
	Participant      CertificateParticipant  `json:"participant"`
	TemplateID       *uuid.UUID              `json:"template_id,omitempty"`
	TemplateCode     *string                 `json:"template_code,omitempty"`
	TemplateName     *string                 `json:"template_name,omitempty"`
	DocumentTypeID   *uuid.UUID              `json:"document_type_id,omitempty"`
	DocumentTypeCode *string                 `json:"document_type_code,omitempty"`
	DocumentTypeName *string                 `json:"document_type_name,omitempty"`
	FileIDs          []uuid.UUID             `json:"file_ids"` // document_pdfs.file_id
}

type Pagination struct {
	Page        int   `json:"page"`
	PageSize    int   `json:"page_size"`
	TotalItems  int64 `json:"total_items"`
	TotalPages  int   `json:"total_pages"`
	HasPrevPage bool  `json:"has_prev_page"`
	HasNextPage bool  `json:"has_next_page"`
}

type CertificateListFilters struct {
	SearchQuery     string     `json:"search_query"`
	SignatureStatus string     `json:"signature_status"`
	EventID         *uuid.UUID `json:"event_id,omitempty"`
	UserID          *uuid.UUID `json:"user_id,omitempty"`
}

type CertificateListResponse struct {
	Items      []CertificateListItem  `json:"items"`
	Pagination Pagination             `json:"pagination"`
	Filters    CertificateListFilters `json:"filters"`
}

// ----------- DETAIL RESPONSE -----------

type CertificateDetailResponse struct {
	Certificate interface{} `json:"certificate"` // normalmente puedes tiparlo como models.Document si quieres
}
