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

// Request principal para crear evento
type CreateEventRequest struct {
	Title               string                          `json:"title"`
	Description         *string                         `json:"description,omitempty"`
	DocumentTypeID      uuid.UUID                       `json:"document_type_id"`
	TemplateID          *uuid.UUID                      `json:"template_id,omitempty"` // opcional
	Location            string                          `json:"location"`
	MaxParticipants     *int                            `json:"max_participants,omitempty"`
	RegistrationOpenAt  *time.Time                      `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time                      `json:"registration_close_at,omitempty"`
	Status              *string                         `json:"status,omitempty"` // opcional, default: SCHEDULED
	Participants        []CreateEventParticipantRequest `json:"participants,omitempty"`
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
}

// ... CreateEventParticipantRequest, CreateEventRequest, UpdateEventRequest, etc.

type ListEventsQuery struct {
	SearchQuery string
	Status      string
	Page        int
	PageSize    int
}

type EventListItem struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	CategoryName      *string   `json:"category_name,omitempty"`
	DocumentTypeName  string    `json:"document_type_name"`
	ParticipantsCount int64     `json:"participants_count"`
	Status            string    `json:"status"`
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
