package dto

import "github.com/google/uuid"

type DocumentTypeCreateRequest struct {
	Code        string  `json:"code" validate:"required,max=50"`
	Name        string  `json:"name" validate:"required,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type DocumentTypeUpdateRequest struct {
	Code        *string `json:"code,omitempty" validate:"omitempty,max=50"`
	Name        *string `json:"name,omitempty" validate:"omitempty,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type DocumentTypeListQuery struct {
	Page        int     `query:"page"`
	PageSize    int     `query:"page_size"`
	SearchQuery *string `query:"search_query"`
	IsActive    *bool   `query:"is_active"`
}

type DocumentTypeCategoryItem struct {
	ID          uint    `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
}

type DocumentTypeListItem struct {
	ID          uuid.UUID                  `json:"id"`
	Code        string                     `json:"code"`
	Name        string                     `json:"name"`
	Description *string                    `json:"description,omitempty"`
	IsActive    bool                       `json:"is_active"`
	CreatedAt   string                     `json:"created_at"`
	UpdatedAt   string                     `json:"updated_at"`
	Categories  []DocumentTypeCategoryItem `json:"categories"`
}

type DocumentTypePagination struct {
	Page        int  `json:"page"`
	PageSize    int  `json:"page_size"`
	TotalItems  int  `json:"total_items"`
	TotalPages  int  `json:"total_pages"`
	HasPrevPage bool `json:"has_prev_page"`
	HasNextPage bool `json:"has_next_page"`
}

type DocumentTypeListFilters struct {
	SearchQuery *string `json:"search_query,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type DocumentTypeListResponse struct {
	Items      []DocumentTypeListItem  `json:"items"`
	Pagination DocumentTypePagination  `json:"pagination"`
	Filters    DocumentTypeListFilters `json:"filters"`
}
