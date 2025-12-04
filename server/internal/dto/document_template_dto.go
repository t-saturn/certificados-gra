package dto

import "github.com/google/uuid"

// DocumentTemplateCreateRequest represents the payload for creating a document template.
type DocumentTemplateCreateRequest struct {
	DocTypeCode     string  `json:"doc_type_code" validate:"required,max=50"`                // document type code, e.g. "CERTIFICATE"
	DocCategoryCode *string `json:"doc_category_code,omitempty" validate:"omitempty,max=50"` // document category code, e.g. "CUR"
	Code            string  `json:"code" validate:"required,max=50"`                         // template code/series
	Name            string  `json:"name" validate:"required,max=150"`
	Description     *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	FileID          string  `json:"file_id" validate:"required"`      // must be a valid UUID
	PrevFileID      string  `json:"prev_file_id" validate:"required"` // must be a valid UUID
	IsActive        *bool   `json:"is_active,omitempty"`
}

// DocumentTemplateUpdateRequest represents the payload for partially updating a document template.
type DocumentTemplateUpdateRequest struct {
	Code        *string `json:"code,omitempty" validate:"omitempty,max=50"`
	Name        *string `json:"name,omitempty" validate:"omitempty,max=150"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	FileID      *string `json:"file_id,omitempty"`
	PrevFileID  *string `json:"prev_file_id,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// DocumentTemplateListQuery captures filters and pagination for listing document templates.
type DocumentTemplateListQuery struct {
	Page                 int     `query:"page"`
	PageSize             int     `query:"page_size"`
	SearchQuery          *string `query:"search_query"`
	IsActive             *bool   `query:"is_active"`
	TemplateTypeCode     *string `query:"template_type_code"`
	TemplateCategoryCode *string `query:"template_category_code"`
}

// DocumentTemplateListItem represents a template row in list responses.
type DocumentTemplateListItem struct {
	ID               uuid.UUID `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	Description      *string   `json:"description,omitempty"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        string    `json:"created_at"`
	UpdatedAt        string    `json:"updated_at"`
	DocumentTypeID   uuid.UUID `json:"document_type_id"`
	DocumentTypeCode string    `json:"document_type_code"`
	DocumentTypeName string    `json:"document_type_name"`
	CategoryID       *uint     `json:"category_id,omitempty"`
	CategoryCode     *string   `json:"category_code,omitempty"`
	CategoryName     *string   `json:"category_name,omitempty"`
}

// DocumentTemplatePagination provides pagination metadata.
type DocumentTemplatePagination struct {
	Page        int  `json:"page"`
	PageSize    int  `json:"page_size"`
	TotalItems  int  `json:"total_items"`
	TotalPages  int  `json:"total_pages"`
	HasPrevPage bool `json:"has_prev_page"`
	HasNextPage bool `json:"has_next_page"`
}

// DocumentTemplateListFilters echoes back the filters applied to the list query.
type DocumentTemplateListFilters struct {
	SearchQuery          *string `json:"search_query,omitempty"`
	IsActive             *bool   `json:"is_active,omitempty"`
	TemplateTypeCode     *string `json:"template_type_code,omitempty"`
	TemplateCategoryCode *string `json:"template_category_code,omitempty"`
}

// DocumentTemplateListResponse represents the list response payload.
type DocumentTemplateListResponse struct {
	Items      []DocumentTemplateListItem  `json:"items"`
	Pagination DocumentTemplatePagination  `json:"pagination"`
	Filters    DocumentTemplateListFilters `json:"filters"`
}
