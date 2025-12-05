package dto

import "time"

// EventScheduleCreateRequest se mantiene igual
type EventScheduleCreateRequest struct {
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

// Ahora recibimos los datos del usuario en vez de user_detail_id
type EventParticipantCreateRequest struct {
	// DNI del participante (obligatorio)
	NationalID string `json:"national_id"`

	// Datos del usuario (solo obligatorios si no existe en BD)
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Email     *string `json:"email,omitempty"`

	RegistrationSource *string `json:"registration_source,omitempty"` // SELF, IMPORTED, ADMIN
}

// EventCreateRequest sigue igual excepto que usa el struct de arriba
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
