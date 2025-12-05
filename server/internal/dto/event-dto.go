package dto

import (
	"time"
)

// EventScheduleCreateRequest representa un bloque de horario del evento.
type EventScheduleCreateRequest struct {
	StartDatetime time.Time `json:"start_datetime"` // requerido
	EndDatetime   time.Time `json:"end_datetime"`   // requerido, > StartDatetime
}

// EventParticipantCreateRequest representa el registro de un participante para el evento.
type EventParticipantCreateRequest struct {
	UserDetailID       string  `json:"user_detail_id"`                // UUID en string
	RegistrationSource *string `json:"registration_source,omitempty"` // SELF, IMPORTED, ADMIN
}

// EventCreateRequest representa el payload para crear un evento con horarios y participantes opcionales.
type EventCreateRequest struct {
	// Si es nil, en el service se asume true.
	IsPublic *bool `json:"is_public,omitempty"`

	// Código del evento, ej. "EVT-2025-OTIC-01"
	Code string `json:"code"`

	// Series de certificado [TYPE / SERIES], ej. "CERT"
	CertificateSeries string `json:"certificate_series"`

	// Path jerárquico de unidades, ej. "GGR|OTIC" o "GGR|OTIC|DEP-XYZ"
	OrganizationalUnitsPath string `json:"organizational_units_path"`

	Title       string  `json:"title"`
	Description *string `json:"description,omitempty"`

	// Template asociado (opcional) - UUID en string
	TemplateID *string `json:"template_id,omitempty"`

	Location        string `json:"location"`
	MaxParticipants *int   `json:"max_participants,omitempty"`

	RegistrationOpenAt  *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt *time.Time `json:"registration_close_at,omitempty"`

	// SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, etc. (opcional, default SCHEDULED)
	Status *string `json:"status,omitempty"`

	// Al menos 1 horario
	Schedules []EventScheduleCreateRequest `json:"schedules"`

	// Participantes opcionales
	Participants []EventParticipantCreateRequest `json:"participants,omitempty"`
}
