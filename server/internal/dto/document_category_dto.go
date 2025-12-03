package dto

// Request para crear categoría
type DocumentCategoryCreateRequest struct {
	Code        string  `json:"code" validate:"required,max=50"`
	Name        string  `json:"name" validate:"required,max=100"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// Query params para listar categorías
type DocumentCategoryListQuery struct {
	Page        int     `query:"page"`
	PageSize    int     `query:"page_size"`
	SearchQuery *string `query:"search_query"`
	IsActive    *bool   `query:"is_active"`
}

// Item de la lista
type DocumentCategoryListItem struct {
	ID          uint    `json:"id"`
	Code        string  `json:"code"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// Meta de paginación
type DocumentCategoryPagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// Respuesta de listado
type DocumentCategoryListResponse struct {
	Items      []DocumentCategoryListItem `json:"items"`
	Pagination DocumentCategoryPagination `json:"pagination"`
}
