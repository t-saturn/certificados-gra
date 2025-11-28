package dto

import "github.com/google/uuid"

// CreateTemplateRequest representa el body del POST /template
type CreateTemplateRequest struct {
	Name           string  `json:"name"`             // requerido
	Description    *string `json:"description"`      // opcional
	DocumentTypeID string  `json:"document_type_id"` // uuid, requerido
	CategoryID     *uint   `json:"category_id"`      // opcional
	FileID         string  `json:"file_id"`          // uuid, requerido
	IsActive       *bool   `json:"is_active"`        // opcional (default true si viene nil)
}

type TemplateCreatedResponse struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	// Puedes agregar más si quieres, pero sin anidar DocumentType
	Message string `json:"message"`
}
