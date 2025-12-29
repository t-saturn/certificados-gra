package dto

import "github.com/google/uuid"

// ----------- QUERY INPUT -----------

type ListCertificatesQuery struct {
	SearchQuery     string     // participante: nombre / apellido / DNI
	EventQuery      string     // evento: title / code
	SignatureStatus string     // PENDING | PARTIALLY_SIGNED | SIGNED | ERROR | all
	Status          string     // CREATED | GENERATED | REJECTED | all
	EventID         *uuid.UUID // filtro directo por evento (opcional)
	Page            int
	PageSize        int
	UserID          *uuid.UUID // opcional (se mantiene)
	NationalID      *string    // NUEVO: DNI (user_details.national_id)
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

type CertificatePDFItem struct {
	ID       uuid.UUID `json:"id"`
	Stage    string    `json:"stage"`
	Version  int       `json:"version"`
	FileID   uuid.UUID `json:"file_id"`
	FileName string    `json:"file_name"`
	FileHash string    `json:"file_hash"`
}

type CertificateListItem struct {
	ID               uuid.UUID               `json:"id"`
	SerialCode       string                  `json:"serial_code"`
	VerificationCode string                  `json:"verification_code"`
	Status           string                  `json:"status"`
	SignatureStatus  string                  `json:"signature_status"`
	StateLabel       string                  `json:"state_label"`
	IssueDate        string                  `json:"issue_date"`
	SignedAt         *string                 `json:"signed_at,omitempty"`
	Event            CertificateEventSummary `json:"event"`
	Participant      CertificateParticipant  `json:"participant"`

	// para “visualización”
	PDFs []CertificatePDFItem `json:"pdfs"`
	// atajo opcional: file_id recomendado para preview
	PreviewFileID *uuid.UUID `json:"preview_file_id,omitempty"`
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
	EventQuery      string     `json:"event_query"`
	SignatureStatus string     `json:"signature_status"`
	EventID         *uuid.UUID `json:"event_id,omitempty"`
	Status          string     `json:"status"`
	UserID          *uuid.UUID `json:"user_id,omitempty"`
	NationalID      *string    `json:"national_id,omitempty"`
}

type CertificateListResponse struct {
	Items      []CertificateListItem  `json:"items"`
	Pagination Pagination             `json:"pagination"`
	Filters    CertificateListFilters `json:"filters"`
}
