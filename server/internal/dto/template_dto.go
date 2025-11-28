package dto

import (
	"time"

	"github.com/google/uuid"
)

// CreateTemplateRequest representa el body del POST /template
type CreateTemplateRequest struct {
	Name           string  `json:"name"`             // requerido
	Description    *string `json:"description"`      // opcional
	DocumentTypeID string  `json:"document_type_id"` // uuid, requerido
	CategoryID     *uint   `json:"category_id"`      // opcional
	FileID         string  `json:"file_id"`          // uuid, requerido
	PrevFileID     string  `json:"prev_file_id"`     // uuid, requerido
	IsActive       *bool   `json:"is_active"`        // opcional (default true si viene nil)
}

type TemplateCreatedResponse struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	// Puedes agregar más si quieres, pero sin anidar DocumentType
	Message string `json:"message"`
}

// Query params normalizados
type TemplateListQuery struct {
	Page        int
	PageSize    int
	SearchQuery *string
	Type        *string // código del tipo, ej: CERTIFICATE
}

// Item de la lista
type TemplateItem struct {
	ID               uuid.UUID  `json:"id"`
	Name             string     `json:"name"`
	Description      *string    `json:"description,omitempty"`
	DocumentTypeID   uuid.UUID  `json:"document_type_id"`
	DocumentTypeCode string     `json:"document_type_code"`
	DocumentTypeName string     `json:"document_type_name"`
	CategoryID       *uint      `json:"category_id,omitempty"`
	CategoryName     *string    `json:"category_name,omitempty"`
	FileID           uuid.UUID  `json:"file_id"`
	PrevFileID       uuid.UUID  `json:"prev_file_id"`
	IsActive         bool       `json:"is_active"`
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// Info de paginación y filtros usados
type TemplateListFilters struct {
	Page        int     `json:"page"`
	PageSize    int     `json:"page_size"`
	Total       int64   `json:"total"`
	HasNextPage bool    `json:"has_next_page"`
	HasPrevPage bool    `json:"has_prev_page"`
	SearchQuery *string `json:"search_query,omitempty"`
	Type        *string `json:"type,omitempty"`
}

// Lo que devolverá el handler dentro de "data"
type TemplateListResponse struct {
	Data    []TemplateItem      `json:"data"`
	Filters TemplateListFilters `json:"filters"`
}

type UpdateTemplateRequest struct {
	Name           *string `json:"name"`             // opcional
	Description    *string `json:"description"`      // opcional
	DocumentTypeID *string `json:"document_type_id"` // opcional (uuid string)
	CategoryID     *uint   `json:"category_id"`      // opcional (puede ser nil para quitar?)
	FileID         *string `json:"file_id"`          // opcional (uuid string)
	PrevFileID     *string `json:"prev_file_id"`     // opcional (uuid string)
	IsActive       *bool   `json:"is_active"`        // opcional
}

type TemplateUpdatedResponse struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name"`
	Message string    `json:"message"`
}
