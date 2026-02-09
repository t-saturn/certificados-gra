package repository

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
)

// UserRepository defines the interface for user data access
type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByNationalID(ctx context.Context, nationalID string) (*models.User, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// UserDetailRepository defines the interface for user detail data access
type UserDetailRepository interface {
	Create(ctx context.Context, detail *models.UserDetail) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.UserDetail, error)
	GetByNationalID(ctx context.Context, nationalID string) (*models.UserDetail, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.UserDetail, error)
	Update(ctx context.Context, detail *models.UserDetail) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// DocumentTypeRepository defines the interface for document type data access
type DocumentTypeRepository interface {
	Create(ctx context.Context, docType *models.DocumentType) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentType, error)
	GetByCode(ctx context.Context, code string) (*models.DocumentType, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.DocumentType, error)
	GetAllActive(ctx context.Context) ([]models.DocumentType, error)
	Update(ctx context.Context, docType *models.DocumentType) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// DocumentCategoryRepository defines the interface for document category data access
type DocumentCategoryRepository interface {
	Create(ctx context.Context, category *models.DocumentCategory) error
	GetByID(ctx context.Context, id uint) (*models.DocumentCategory, error)
	GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentCategory, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.DocumentCategory, error)
	Update(ctx context.Context, category *models.DocumentCategory) error
	Delete(ctx context.Context, id uint) error
	Count(ctx context.Context) (int64, error)
}

// DocumentTemplateRepository defines the interface for document template data access
type DocumentTemplateRepository interface {
	Create(ctx context.Context, template *models.DocumentTemplate) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error)
	GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentTemplate, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.DocumentTemplate, error)
	GetAllActive(ctx context.Context) ([]models.DocumentTemplate, error)
	Update(ctx context.Context, template *models.DocumentTemplate) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// EventRepository defines the interface for event data access
type EventRepository interface {
	Create(ctx context.Context, event *models.Event) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error)
	GetByCode(ctx context.Context, code string) (*models.Event, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.Event, error)
	GetByStatus(ctx context.Context, status string) ([]models.Event, error)
	GetPublic(ctx context.Context, limit, offset int) ([]models.Event, error)
	Update(ctx context.Context, event *models.Event) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// EventParticipantRepository defines the interface for event participant data access
type EventParticipantRepository interface {
	Create(ctx context.Context, participant *models.EventParticipant) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error)
	GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.EventParticipant, error)
	GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.EventParticipant, error)
	Update(ctx context.Context, participant *models.EventParticipant) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
	CountByEventID(ctx context.Context, eventID uuid.UUID) (int64, error)
}

// DocumentRepository defines the interface for document data access
type DocumentRepository interface {
	Create(ctx context.Context, doc *models.Document) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error)
	GetBySerialCode(ctx context.Context, serialCode string) (*models.Document, error)
	GetByVerificationCode(ctx context.Context, verificationCode string) (*models.Document, error)
	GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.Document, error)
	GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.Document, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.Document, error)
	Update(ctx context.Context, doc *models.Document) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// NotificationRepository defines the interface for notification data access
type NotificationRepository interface {
	Create(ctx context.Context, notification *models.Notification) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Notification, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Notification, error)
	GetUnreadByUserID(ctx context.Context, userID uuid.UUID) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, id uuid.UUID) error
	MarkAllAsRead(ctx context.Context, userID uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
	CountUnreadByUserID(ctx context.Context, userID uuid.UUID) (int64, error)
}

// EvaluationRepository defines the interface for evaluation data access
type EvaluationRepository interface {
	Create(ctx context.Context, evaluation *models.Evaluation) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Evaluation, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Evaluation, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.Evaluation, error)
	Update(ctx context.Context, evaluation *models.Evaluation) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}

// StudyMaterialRepository defines the interface for study material data access
type StudyMaterialRepository interface {
	Create(ctx context.Context, material *models.StudyMaterial) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.StudyMaterial, error)
	GetAll(ctx context.Context, limit, offset int) ([]models.StudyMaterial, error)
	Update(ctx context.Context, material *models.StudyMaterial) error
	Delete(ctx context.Context, id uuid.UUID) error
	Count(ctx context.Context) (int64, error)
}
