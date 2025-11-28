package dto

import "github.com/google/uuid"

type ListCertificatesQuery struct {
	SearchQuery string
	Status      string
	Page        int
	PageSize    int
	UserID      *uuid.UUID
}

type CertificateListFilters struct {
	Page        int    `json:"page"`
	PageSize    int    `json:"page_size"`
	Total       int64  `json:"total"`
	HasNextPage bool   `json:"has_next_page"`
	HasPrevPage bool   `json:"has_prev_page"`
	SearchQuery string `json:"search_query"`
	Status      string `json:"status"` // "all" o el valor filtrado
}
