package repository

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/dto"
)

// -- fn document template repository

// FNDocumentTemplateRepository defines the interface for document template data access with nested relations
type FNDocumentTemplateRepository interface {
	Create(ctx context.Context, template *models.DocumentTemplate, fields []models.DocumentTemplateField) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error)
	GetByCode(ctx context.Context, code string) (*models.DocumentTemplate, error)
	List(ctx context.Context, params dto.DocumentTemplateListQuery) ([]models.DocumentTemplate, int64, error)
	Update(ctx context.Context, template *models.DocumentTemplate) error
	Delete(ctx context.Context, id uuid.UUID) error
	SetActive(ctx context.Context, id uuid.UUID, active bool) error
	ExistsByCode(ctx context.Context, code string) (bool, error)
	ExistsByCodeExcludingID(ctx context.Context, code string, excludeID uuid.UUID) (bool, error)
	GetDocumentTypeByCode(ctx context.Context, code string) (*models.DocumentType, error)
	GetCategoryByCodeAndTypeID(ctx context.Context, code string, typeID uuid.UUID) (*models.DocumentCategory, error)
	CountFieldsByTemplateID(ctx context.Context, templateID uuid.UUID) (int64, error)

	// field operations
	CreateField(ctx context.Context, field *models.DocumentTemplateField) error
	UpdateField(ctx context.Context, field *models.DocumentTemplateField) error
	DeleteField(ctx context.Context, id uuid.UUID) error
	GetFieldByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplateField, error)
	GetFieldsByTemplateID(ctx context.Context, templateID uuid.UUID) ([]models.DocumentTemplateField, error)
	DeleteFieldsByTemplateID(ctx context.Context, templateID uuid.UUID) error
	FieldExistsByKeyAndTemplateID(ctx context.Context, key string, templateID uuid.UUID) (bool, error)
	FieldExistsByKeyAndTemplateIDExcludingID(ctx context.Context, key string, templateID uuid.UUID, excludeID uuid.UUID) (bool, error)
}

// -- fn event repository

// FNEventRepository defines the interface for event data access with nested relations
type FNEventRepository interface {
	Create(ctx context.Context, event *models.Event, schedules []models.EventSchedule, participants []models.EventParticipant) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error)
	GetByCode(ctx context.Context, code string) (*models.Event, error)
	List(ctx context.Context, params dto.EventListQuery) ([]models.Event, int64, error)
	Update(ctx context.Context, event *models.Event) error
	Delete(ctx context.Context, id uuid.UUID) error
	ExistsByCode(ctx context.Context, code string) (bool, error)
	ExistsByCodeExcludingID(ctx context.Context, code string, excludeID uuid.UUID) (bool, error)
	CountParticipantsByEventID(ctx context.Context, eventID uuid.UUID) (int64, error)
	CountSchedulesByEventID(ctx context.Context, eventID uuid.UUID) (int64, error)
}

// -- fn user detail repository

// FNUserDetailRepository defines the interface for user detail data access
type FNUserDetailRepository interface {
	GetByNationalID(ctx context.Context, nationalID string) (*models.UserDetail, error)
	Create(ctx context.Context, userDetail *models.UserDetail) error
}