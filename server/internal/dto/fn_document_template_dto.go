package dto

import (
	"time"

	"github.com/google/uuid"
)

// -- request dtos

// DocumentTemplateCreateRequest represents the request to create a document template
type DocumentTemplateCreateRequest struct {
	Code            string                               `json:"code" validate:"required,min=1,max=50"`
	Name            string                               `json:"name" validate:"required,min=1,max=150"`
	DocTypeCode     string                               `json:"doc_type_code" validate:"required"`
	DocCategoryCode *string                              `json:"doc_category_code,omitempty"`
	FileID          string                               `json:"file_id" validate:"required,uuid"`
	PrevFileID      string                               `json:"prev_file_id" validate:"required,uuid"`
	IsActive        *bool                                `json:"is_active,omitempty"`
	Fields          []DocumentTemplateFieldCreateRequest `json:"fields,omitempty"`
}

// DocumentTemplateFieldCreateRequest represents a field in template creation
type DocumentTemplateFieldCreateRequest struct {
	Key       string  `json:"key" validate:"required,min=1,max=120"`
	Label     string  `json:"label" validate:"required,min=1,max=200"`
	FieldType *string `json:"field_type,omitempty"`
	Required  *bool   `json:"required,omitempty"`
}

// DocumentTemplateUpdateRequest represents the request to update a document template
type DocumentTemplateUpdateRequest struct {
	Code       *string                               `json:"code,omitempty" validate:"omitempty,min=1,max=50"`
	Name       *string                               `json:"name,omitempty" validate:"omitempty,min=1,max=150"`
	FileID     *string                               `json:"file_id,omitempty" validate:"omitempty,uuid"`
	PrevFileID *string                               `json:"prev_file_id,omitempty" validate:"omitempty,uuid"`
	IsActive   *bool                                 `json:"is_active,omitempty"`
	Fields     []DocumentTemplateFieldUpdateRequest  `json:"fields,omitempty"`
}

// DocumentTemplateFieldUpdateRequest represents a field in template update
type DocumentTemplateFieldUpdateRequest struct {
	ID        *string `json:"id,omitempty"`
	Key       string  `json:"key" validate:"required,min=1,max=120"`
	Label     string  `json:"label" validate:"required,min=1,max=200"`
	FieldType *string `json:"field_type,omitempty"`
	Required  *bool   `json:"required,omitempty"`
	Delete    *bool   `json:"_delete,omitempty"`
}

// DocumentTemplateListQuery represents query parameters for listing templates
type DocumentTemplateListQuery struct {
	Page                 int     `query:"page"`
	PageSize             int     `query:"page_size"`
	SearchQuery          *string `query:"q"`
	IsActive             *bool   `query:"is_active"`
	TemplateTypeCode     *string `query:"type_code"`
	TemplateCategoryCode *string `query:"category_code"`
}

// -- response dtos

// DocumentTemplateResponse represents a single template with nested relations
type DocumentTemplateResponse struct {
	ID           uuid.UUID                       `json:"id"`
	Code         string                          `json:"code"`
	Name         string                          `json:"name"`
	FileID       string                          `json:"file_id"`
	PrevFileID   string                          `json:"prev_file_id"`
	IsActive     bool                            `json:"is_active"`
	CreatedBy    *uuid.UUID                      `json:"created_by,omitempty"`
	CreatedAt    time.Time                       `json:"created_at"`
	UpdatedAt    time.Time                       `json:"updated_at"`
	DocumentType DocumentTypeEmbedded            `json:"document_type"`
	Category     *DocumentCategoryEmbedded       `json:"category,omitempty"`
	Fields       []DocumentTemplateFieldResponse `json:"fields"`
}

// DocumentTypeEmbedded represents embedded document type info
type DocumentTypeEmbedded struct {
	ID       uuid.UUID `json:"id"`
	Code     string    `json:"code"`
	Name     string    `json:"name"`
	IsActive bool      `json:"is_active"`
}

// DocumentCategoryEmbedded represents embedded category info
type DocumentCategoryEmbedded struct {
	ID       uint   `json:"id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	IsActive bool   `json:"is_active"`
}

// DocumentTemplateFieldResponse represents a template field in response
type DocumentTemplateFieldResponse struct {
	ID        uuid.UUID `json:"id"`
	Key       string    `json:"key"`
	Label     string    `json:"label"`
	FieldType string    `json:"field_type"`
	Required  bool      `json:"required"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// DocumentTemplateListItem represents a template item in list response
type DocumentTemplateListItem struct {
	ID               uuid.UUID `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	FileID           string    `json:"file_id"`
	PrevFileID       string    `json:"prev_file_id"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        string    `json:"created_at"`
	UpdatedAt        string    `json:"updated_at"`
	DocumentTypeID   uuid.UUID `json:"document_type_id"`
	DocumentTypeCode string    `json:"document_type_code"`
	DocumentTypeName string    `json:"document_type_name"`
	CategoryID       *uint     `json:"category_id,omitempty"`
	CategoryCode     *string   `json:"category_code,omitempty"`
	CategoryName     *string   `json:"category_name,omitempty"`
	FieldsCount      int       `json:"fields_count"`
}