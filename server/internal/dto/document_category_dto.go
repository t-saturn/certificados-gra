package dto

type DocumentCategoryCreateRequest struct {
	DocTypeCode string  `json:"doc_type_code" validate:"required,max=50"`
	Code        string  `json:"code" validate:"required,max=50"`
	Name        string  `json:"name" validate:"required,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type DocumentCategoryUpdateRequest struct {
	Code        *string `json:"code,omitempty" validate:"omitempty,max=50"`
	Name        *string `json:"name,omitempty" validate:"omitempty,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

type DocumentCategoryListQuery struct {
	Page        int     `query:"page"`
	PageSize    int     `query:"page_size"`
	SearchQuery *string `query:"search_query"`
	IsActive    *bool   `query:"is_active"`
	DocTypeCode *string `query:"doc_type_code"`
	DocTypeName *string `query:"doc_type_name"`
}

type DocumentCategoryListItem struct {
	ID          uint    `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

type DocumentCategoryPagination struct {
	Page        int  `json:"page"`
	PageSize    int  `json:"page_size"`
	TotalItems  int  `json:"total_items"`
	TotalPages  int  `json:"total_pages"`
	HasPrevPage bool `json:"has_prev_page"`
	HasNextPage bool `json:"has_next_page"`
}

type DocumentCategoryListFilters struct {
	SearchQuery *string `json:"search_query,omitempty"`
	IsActive    *bool   `json:"is_active,omitempty"`
	DocTypeCode *string `json:"doc_type_code,omitempty"`
	DocTypeName *string `json:"doc_type_name,omitempty"`
}

type DocumentCategoryListResponse struct {
	Items      []DocumentCategoryListItem  `json:"items"`
	Pagination DocumentCategoryPagination  `json:"pagination"`
	Filters    DocumentCategoryListFilters `json:"filters"`
}
