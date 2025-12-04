package dto

// DocumentTemplateCreateRequest represents the payload for creating a document template.
type DocumentTemplateCreateRequest struct {
	DocTypeCode string  `json:"doc_type_code" validate:"required,max=50"` // document type code, e.g. "CERTIFICATE"
	Code        string  `json:"code" validate:"required,max=50"`          // template code/series
	Name        string  `json:"name" validate:"required,max=150"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=1000"`
	CategoryID  *uint   `json:"category_id,omitempty"`
	FileID      string  `json:"file_id" validate:"required"`      // must be a valid UUID
	PrevFileID  string  `json:"prev_file_id" validate:"required"` // must be a valid UUID
	IsActive    *bool   `json:"is_active,omitempty"`
}
