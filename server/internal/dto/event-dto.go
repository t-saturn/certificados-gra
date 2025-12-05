package dto

import (
	"time"

	"github.com/google/uuid"
)

// --- CREATE (ya lo tenías) ---

type EventScheduleCreateRequest struct {
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

type EventParticipantCreateRequest struct {
	NationalID string  `json:"national_id"`
	FirstName  *string `json:"first_name,omitempty"`
	LastName   *string `json:"last_name,omitempty"`
	Phone      *string `json:"phone,omitempty"`
	Email      *string `json:"email,omitempty"`

	RegistrationSource *string `json:"registration_source,omitempty"` // SELF, IMPORTED, ADMIN
}

type EventCreateRequest struct {
	IsPublic *bool `json:"is_public,omitempty"`

	Code                    string `json:"code"`
	CertificateSeries       string `json:"certificate_series"`
	OrganizationalUnitsPath string `json:"organizational_units_path"`

	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`

	TemplateID *string `json:"template_id,omitempty"`

	Location        string `json:"location"`
	MaxParticipants *int   `json:"max_participants,omitempty"`

	RegistrationOpenAt  *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time `json:"registration_close_at,omitempty"`

	Status *string `json:"status,omitempty"`

	Schedules    []EventScheduleCreateRequest    `json:"schedules"`
	Participants []EventParticipantCreateRequest `json:"participants,omitempty"`
}

// --- LIST QUERY / RESPONSE ---

type EventListQuery struct {
	Page        int     `query:"page"`
	PageSize    int     `query:"page_size"`
	SearchQuery *string `query:"search_query"` // por título

	Status           *string `query:"status"`             // SCHEDULED, COMPLETED, etc.
	TemplateID       *string `query:"template_id"`        // UUID string
	DocumentTypeCode *string `query:"document_type_code"` // ej. CERT
	IsTemplateActive *bool   `query:"is_template_active"` // filtra por template.is_active

	IsPublic *bool   `query:"is_public"` // filtra por events.is_public
	UserID   *string `query:"user_id"`   // UUID del usuario (created_by)

	CreatedDateFromStr *string `query:"date_from"` // YYYY-MM-DD
	CreatedDateToStr   *string `query:"date_to"`   // YYYY-MM-DD
}

type EventListItem struct {
	ID                      uuid.UUID `json:"id"`
	Code                    string    `json:"code"`
	Title                   string    `json:"title"`
	Status                  string    `json:"status"`
	IsPublic                bool      `json:"is_public"`
	CertificateSeries       string    `json:"certificate_series"`
	OrganizationalUnitsPath string    `json:"organizational_units_path"`
	Location                string    `json:"location"`
	MaxParticipants         *int      `json:"max_participants,omitempty"`
	RegistrationOpenAt      *string   `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *string   `json:"registration_close_at,omitempty"`
	CreatedAt               string    `json:"created_at"`
	UpdatedAt               string    `json:"updated_at"`

	TemplateID       *uuid.UUID `json:"template_id,omitempty"`
	TemplateCode     *string    `json:"template_code,omitempty"`
	TemplateName     *string    `json:"template_name,omitempty"`
	DocumentTypeID   *uuid.UUID `json:"document_type_id,omitempty"`
	DocumentTypeCode *string    `json:"document_type_code,omitempty"`
	DocumentTypeName *string    `json:"document_type_name,omitempty"`
}

type EventListPagination struct {
	Page        int  `json:"page"`
	PageSize    int  `json:"page_size"`
	TotalItems  int  `json:"total_items"`
	TotalPages  int  `json:"total_pages"`
	HasPrevPage bool `json:"has_prev_page"`
	HasNextPage bool `json:"has_next_page"`
}

type EventListFilters struct {
	SearchQuery      *string `json:"search_query,omitempty"`
	Status           *string `json:"status,omitempty"`
	TemplateID       *string `json:"template_id,omitempty"`
	DocumentTypeCode *string `json:"document_type_code,omitempty"`
	IsTemplateActive *bool   `json:"is_template_active,omitempty"`

	IsPublic *bool   `json:"is_public,omitempty"`
	UserID   *string `json:"user_id,omitempty"`

	CreatedDateFrom *string `json:"date_from,omitempty"`
	CreatedDateTo   *string `json:"date_to,omitempty"`
}

type EventListResponse struct {
	Items      []EventListItem     `json:"items"`
	Pagination EventListPagination `json:"pagination"`
	Filters    EventListFilters    `json:"filters"`
}

// --- DETAIL RESPONSE ---

type EventDetailTemplateInfo struct {
	ID               uuid.UUID `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	IsActive         bool      `json:"is_active"`
	DocumentTypeID   uuid.UUID `json:"document_type_id"`
	DocumentTypeCode string    `json:"document_type_code"`
	DocumentTypeName string    `json:"document_type_name"`
}

type EventDetailScheduleItem struct {
	ID            uuid.UUID `json:"id"`
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

type EventDetailParticipantItem struct {
	ID                 uuid.UUID `json:"id"`
	UserDetailID       uuid.UUID `json:"user_detail_id"`
	NationalID         string    `json:"national_id"`
	FirstName          string    `json:"first_name"`
	LastName           string    `json:"last_name"`
	Phone              *string   `json:"phone,omitempty"`
	Email              *string   `json:"email,omitempty"`
	RegistrationSource *string   `json:"registration_source,omitempty"`
	RegistrationStatus string    `json:"registration_status"`
	AttendanceStatus   string    `json:"attendance_status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type EventDetailDocumentItem struct {
	ID               uuid.UUID  `json:"id"`
	UserDetailID     uuid.UUID  `json:"user_detail_id"`
	SerialCode       string     `json:"serial_code"`
	VerificationCode string     `json:"verification_code"`
	Status           string     `json:"status"`
	IssueDate        time.Time  `json:"issue_date"`
	TemplateID       *uuid.UUID `json:"template_id,omitempty"`
	DocumentTypeID   uuid.UUID  `json:"document_type_id"`

	DocumentTypeCode string `json:"document_type_code"`
	DocumentTypeName string `json:"document_type_name"`
}

type EventDetailResponse struct {
	ID                      uuid.UUID  `json:"id"`
	IsPublic                bool       `json:"is_public"`
	Code                    string     `json:"code"`
	CertificateSeries       string     `json:"certificate_series"`
	OrganizationalUnitsPath string     `json:"organizational_units_path"`
	Title                   string     `json:"title"`
	Description             *string    `json:"description,omitempty"`
	Location                string     `json:"location"`
	MaxParticipants         *int       `json:"max_participants,omitempty"`
	RegistrationOpenAt      *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *time.Time `json:"registration_close_at,omitempty"`
	Status                  string     `json:"status"`
	CreatedBy               uuid.UUID  `json:"created_by"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`

	Template     *EventDetailTemplateInfo     `json:"template,omitempty"`
	Schedules    []EventDetailScheduleItem    `json:"schedules"`
	Participants []EventDetailParticipantItem `json:"participants"`
	Documents    []EventDetailDocumentItem    `json:"documents"`
}
