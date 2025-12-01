package dto

import (
	"time"

	"github.com/google/uuid"
)

// Participante para creación de evento
type CreateEventParticipantRequest struct {
	NationalID         string  `json:"national_id"` // DNI (obligatorio)
	FirstName          string  `json:"first_name"`  // obligatorio si no existe en BD
	LastName           string  `json:"last_name"`   // obligatorio si no existe en BD
	Phone              *string `json:"phone,omitempty"`
	Email              *string `json:"email,omitempty"`
	RegistrationSource *string `json:"registration_source,omitempty"` // SELF, IMPORTED, ADMIN
	RegistrationStatus *string `json:"registration_status,omitempty"` // por defecto: REGISTERED
	AttendanceStatus   *string `json:"attendance_status,omitempty"`   // por defecto: PENDING
}

type CreateEventScheduleRequest struct {
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

type CreateEventRequest struct {
	Title               string                          `json:"title"`
	Description         *string                         `json:"description,omitempty"`
	DocumentTypeID      uuid.UUID                       `json:"document_type_id"`
	TemplateID          *uuid.UUID                      `json:"template_id,omitempty"`
	Location            string                          `json:"location"`
	MaxParticipants     *int                            `json:"max_participants,omitempty"`
	RegistrationOpenAt  *time.Time                      `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time                      `json:"registration_close_at,omitempty"`
	Status              *string                         `json:"status,omitempty"`
	Participants        []CreateEventParticipantRequest `json:"participants,omitempty"`

	// NUEVO: arreglo de bloques de horario
	Schedules []CreateEventScheduleRequest `json:"schedules"`
}

type UpdateEventRequest struct {
	Title               *string    `json:"title,omitempty"`
	Description         *string    `json:"description,omitempty"`
	DocumentTypeID      *uuid.UUID `json:"document_type_id,omitempty"`
	TemplateID          *uuid.UUID `json:"template_id,omitempty"`
	Location            *string    `json:"location,omitempty"`
	MaxParticipants     *int       `json:"max_participants,omitempty"`
	RegistrationOpenAt  *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time `json:"registration_close_at,omitempty"`
	Status              *string    `json:"status,omitempty"`

	Schedules *[]CreateEventScheduleRequest `json:"schedules,omitempty"`
}

type ListEventsQuery struct {
	SearchQuery string
	Status      string
	Page        int
	PageSize    int
}

type EventScheduleItem struct {
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

type EventListItem struct {
	ID                uuid.UUID           `json:"id"`
	Name              string              `json:"name"`
	CategoryName      *string             `json:"category_name,omitempty"`
	DocumentTypeName  string              `json:"document_type_name"`
	ParticipantsCount int64               `json:"participants_count"`
	Status            string              `json:"status"`
	Schedules         []EventScheduleItem `json:"schedules"`
}

type EventListFilters struct {
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
	Total       int64  `json:"total"`
	HasNextPage bool   `json:"has_next_page"`
	HasPrevPage bool   `json:"has_prev_page"`
	SearchQuery string `json:"search_query"`
	Status      string `json:"status"` // "all" o el que mandó
}

type ListEventsResult struct {
	Events  []EventListItem  `json:"events"`
	Filters EventListFilters `json:"filters"`
}

type UploadEventParticipantsRequest struct {
	Participants []CreateEventParticipantRequest `json:"participants"`
}

type ListEventParticipantsQuery struct {
	SearchQuery string
	Page        int
	PageSize    int
}

type EventParticipantListItem struct {
	UserDetailID       uuid.UUID `json:"user_detail_id"`
	NationalID         string    `json:"national_id"`
	FullName           string    `json:"full_name"`
	FirstName          string    `json:"first_name"`
	LastName           string    `json:"last_name"`
	Email              *string   `json:"email,omitempty"`
	Phone              *string   `json:"phone,omitempty"`
	RegistrationSource *string   `json:"registration_source,omitempty"`
	RegistrationStatus string    `json:"registration_status"`
	AttendanceStatus   string    `json:"attendance_status"`
}

type EventParticipantsFilters struct {
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
	Total       int64  `json:"total"`
	HasNextPage bool   `json:"has_next_page"`
	HasPrevPage bool   `json:"has_prev_page"`
	SearchQuery string `json:"search_query"`
}

type ListEventParticipantsResult struct {
	Participants []EventParticipantListItem `json:"participants"`
	Filters      EventParticipantsFilters   `json:"filters"`
}

// Para acciones de certificados: uno o varios participantes
// Los IDs son de UserDetail
type CertificateActionRequest struct {
	ParticipantIDs []uuid.UUID `json:"participant_ids,omitempty"`
}

type EventDetailSchedule struct {
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

// Info del tipo de documento asociado al evento
type EventDetailDocumentType struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
	Name string    `json:"name"`
}

// Info de la plantilla asociada al evento (opcional)
type EventDetailTemplate struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	CategoryName *string    `json:"category_name,omitempty"`
	FileID       uuid.UUID  `json:"file_id"`
	IsActive     bool       `json:"is_active"`
	CreatedBy    *uuid.UUID `json:"created_by,omitempty"`
}

// Documento (certificado) emitido a un participante en este evento
type EventParticipantDocument struct {
	ID               uuid.UUID  `json:"id"`
	SerialCode       string     `json:"serial_code"`
	VerificationCode string     `json:"verification_code"`
	Status           string     `json:"status"`      // ISSUED, REVOKED, etc.
	IssueDate        time.Time  `json:"issue_date"`  // fecha de emisión
	TemplateID       *uuid.UUID `json:"template_id"` // por si quieres saber con qué plantilla se emitió
}

// Participante + sus certificados
type EventParticipantDetail struct {
	UserDetailID       uuid.UUID                  `json:"user_detail_id"`
	NationalID         string                     `json:"national_id"`
	FirstName          string                     `json:"first_name"`
	LastName           string                     `json:"last_name"`
	Email              *string                    `json:"email,omitempty"`
	Phone              *string                    `json:"phone,omitempty"`
	RegistrationSource *string                    `json:"registration_source,omitempty"`
	RegistrationStatus string                     `json:"registration_status"`
	AttendanceStatus   string                     `json:"attendance_status"`
	Documents          []EventParticipantDocument `json:"documents"` // certificados de este evento
}

// Respuesta principal de detalle de evento COMPLETO
type EventDetailResponse struct {
	ID                  uuid.UUID                `json:"id"`
	Title               string                   `json:"title"`
	Description         *string                  `json:"description,omitempty"`
	DocumentType        EventDetailDocumentType  `json:"document_type"`
	Template            *EventDetailTemplate     `json:"template,omitempty"`
	Location            string                   `json:"location"`
	MaxParticipants     *int                     `json:"max_participants,omitempty"`
	RegistrationOpenAt  *time.Time               `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time               `json:"registration_close_at,omitempty"`
	Status              string                   `json:"status"`
	CreatedBy           uuid.UUID                `json:"created_by"`
	CreatedAt           time.Time                `json:"created_at"`
	UpdatedAt           time.Time                `json:"updated_at"`
	Schedules           []EventDetailSchedule    `json:"schedules"`
	Participants        []EventParticipantDetail `json:"participants"`
}
