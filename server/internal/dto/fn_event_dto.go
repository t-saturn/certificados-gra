package dto

import (
	"time"

	"github.com/google/uuid"
)

// -- request dtos

// EventCreateRequest represents the request to create an event
type EventCreateRequest struct {
	Code                    string                          `json:"code" validate:"required,min=1,max=100"`
	Title                   string                          `json:"title" validate:"required,min=1,max=200"`
	Description             *string                         `json:"description,omitempty"`
	Location                string                          `json:"location" validate:"required,min=1,max=200"`
	IsPublic                *bool                           `json:"is_public,omitempty"`
	CertificateSeries       *string                         `json:"certificate_series,omitempty"`
	OrganizationalUnitsPath *string                         `json:"organizational_units_path,omitempty"`
	TemplateID              *string                         `json:"template_id,omitempty" validate:"omitempty,uuid"`
	MaxParticipants         *int                            `json:"max_participants,omitempty"`
	RegistrationOpenAt      *time.Time                      `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *time.Time                      `json:"registration_close_at,omitempty"`
	Status                  *string                         `json:"status,omitempty"`
	Schedules               []EventScheduleCreateRequest    `json:"schedules,omitempty"`
	Participants            []EventParticipantCreateRequest `json:"participants,omitempty"`
}

// EventScheduleCreateRequest represents a schedule in event creation
type EventScheduleCreateRequest struct {
	StartDatetime time.Time `json:"start_datetime" validate:"required"`
	EndDatetime   time.Time `json:"end_datetime" validate:"required"`
}

// EventParticipantCreateRequest represents a participant in event creation
type EventParticipantCreateRequest struct {
	NationalID         string  `json:"national_id" validate:"required,min=1,max=20"`
	FirstName          string  `json:"first_name" validate:"required,min=1,max=100"`
	LastName           string  `json:"last_name" validate:"required,min=1,max=100"`
	Email              *string `json:"email,omitempty" validate:"omitempty,email"`
	Phone              *string `json:"phone,omitempty"`
	RegistrationSource *string `json:"registration_source,omitempty"`
	RegistrationStatus *string `json:"registration_status,omitempty"`
	AttendanceStatus   *string `json:"attendance_status,omitempty"`
}

// EventUpdateRequest represents the request to update an event
type EventUpdateRequest struct {
	Code                    *string    `json:"code,omitempty" validate:"omitempty,min=1,max=100"`
	Title                   *string    `json:"title,omitempty" validate:"omitempty,min=1,max=200"`
	Description             *string    `json:"description,omitempty"`
	Location                *string    `json:"location,omitempty" validate:"omitempty,min=1,max=200"`
	IsPublic                *bool      `json:"is_public,omitempty"`
	CertificateSeries       *string    `json:"certificate_series,omitempty"`
	OrganizationalUnitsPath *string    `json:"organizational_units_path,omitempty"`
	TemplateID              *string    `json:"template_id,omitempty" validate:"omitempty,uuid"`
	MaxParticipants         *int       `json:"max_participants,omitempty"`
	RegistrationOpenAt      *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *time.Time `json:"registration_close_at,omitempty"`
	Status                  *string    `json:"status,omitempty"`
}

// EventListQuery represents query parameters for listing events
type EventListQuery struct {
	Page       int     `query:"page"`
	PageSize   int     `query:"page_size"`
	SearchQuery *string `query:"q"`
	IsPublic   *bool   `query:"is_public"`
	Status     *string `query:"status"`
	TemplateID *string `query:"template_id"`
}

// -- response dtos

// EventResponse represents a single event with nested relations
type EventResponse struct {
	ID                      uuid.UUID                    `json:"id"`
	Code                    string                       `json:"code"`
	Title                   string                       `json:"title"`
	Description             *string                      `json:"description,omitempty"`
	Location                string                       `json:"location"`
	IsPublic                bool                         `json:"is_public"`
	CertificateSeries       string                       `json:"certificate_series"`
	OrganizationalUnitsPath string                       `json:"organizational_units_path"`
	MaxParticipants         *int                         `json:"max_participants,omitempty"`
	RegistrationOpenAt      *time.Time                   `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *time.Time                   `json:"registration_close_at,omitempty"`
	Status                  string                       `json:"status"`
	CreatedBy               uuid.UUID                    `json:"created_by"`
	CreatedAt               time.Time                    `json:"created_at"`
	UpdatedAt               time.Time                    `json:"updated_at"`
	Template                *DocumentTemplateEmbedded    `json:"template,omitempty"`
	Schedules               []EventScheduleResponse      `json:"schedules,omitempty"`
	Participants            []EventParticipantResponse   `json:"participants,omitempty"`
	ParticipantsCount       int                          `json:"participants_count"`
}

// DocumentTemplateEmbedded represents embedded template info for events
type DocumentTemplateEmbedded struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
	Name string    `json:"name"`
}

// EventScheduleResponse represents a schedule in response
type EventScheduleResponse struct {
	ID            uuid.UUID `json:"id"`
	StartDatetime time.Time `json:"start_datetime"`
	EndDatetime   time.Time `json:"end_datetime"`
}

// EventParticipantResponse represents a participant in response
type EventParticipantResponse struct {
	ID                 uuid.UUID               `json:"id"`
	RegistrationSource *string                 `json:"registration_source,omitempty"`
	RegistrationStatus string                  `json:"registration_status"`
	AttendanceStatus   string                  `json:"attendance_status"`
	CreatedAt          time.Time               `json:"created_at"`
	UserDetail         UserDetailEmbedded      `json:"user_detail"`
}

// UserDetailEmbedded represents embedded user detail info
type UserDetailEmbedded struct {
	ID         uuid.UUID `json:"id"`
	NationalID string    `json:"national_id"`
	FirstName  string    `json:"first_name"`
	LastName   string    `json:"last_name"`
	Email      *string   `json:"email,omitempty"`
	Phone      *string   `json:"phone,omitempty"`
}

// EventListItem represents an event item in list response
type EventListItem struct {
	ID                      uuid.UUID  `json:"id"`
	Code                    string     `json:"code"`
	Title                   string     `json:"title"`
	Description             *string    `json:"description,omitempty"`
	Location                string     `json:"location"`
	IsPublic                bool       `json:"is_public"`
	Status                  string     `json:"status"`
	MaxParticipants         *int       `json:"max_participants,omitempty"`
	RegistrationOpenAt      *time.Time `json:"registration_open_at,omitempty"`
	RegistrationCloseAt     *time.Time `json:"registration_close_at,omitempty"`
	CreatedAt               string     `json:"created_at"`
	UpdatedAt               string     `json:"updated_at"`
	TemplateID              *uuid.UUID `json:"template_id,omitempty"`
	TemplateCode            *string    `json:"template_code,omitempty"`
	TemplateName            *string    `json:"template_name,omitempty"`
	ParticipantsCount       int        `json:"participants_count"`
	SchedulesCount          int        `json:"schedules_count"`
}