package repository

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/dto"
)

// FNDocumentTemplateRepository defines the interface for document template data access with nested relations
type FNDocumentTemplateRepository interface {
	// Create creates a new document template with optional fields
	Create(ctx context.Context, template *models.DocumentTemplate, fields []models.DocumentTemplateField) error

	// GetByID retrieves a template by ID with all relations (DocumentType, Category, Fields)
	GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error)

	// GetByCode retrieves a template by code with all relations
	GetByCode(ctx context.Context, code string) (*models.DocumentTemplate, error)

	// List retrieves templates with filters, pagination, and nested DocumentType/Category
	List(ctx context.Context, params dto.DocumentTemplateListQuery) ([]models.DocumentTemplate, int64, error)

	// Update updates a document template
	Update(ctx context.Context, template *models.DocumentTemplate) error

	// SetActive enables or disables a template
	SetActive(ctx context.Context, id uuid.UUID, active bool) error

	// Delete soft deletes a template (or hard delete based on business rules)
	Delete(ctx context.Context, id uuid.UUID) error

	// ExistsByCode checks if a template with given code exists
	ExistsByCode(ctx context.Context, code string) (bool, error)

	// GetDocumentTypeByCode retrieves document type by code
	GetDocumentTypeByCode(ctx context.Context, code string) (*models.DocumentType, error)

	// GetCategoryByCodeAndTypeID retrieves category by code and document type ID
	GetCategoryByCodeAndTypeID(ctx context.Context, code string, typeID uuid.UUID) (*models.DocumentCategory, error)

	// CountFieldsByTemplateID counts fields for a template
	CountFieldsByTemplateID(ctx context.Context, templateID uuid.UUID) (int64, error)
}