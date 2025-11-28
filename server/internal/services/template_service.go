package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TemplateService interface {
	CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.CreateTemplateRequest) (*models.DocumentTemplate, error)
}

type templateServiceImpl struct {
	db   *gorm.DB
	noti NotificationService
}

func NewTemplateService(db *gorm.DB, noti NotificationService) TemplateService {
	return &templateServiceImpl{
		db:   db,
		noti: noti,
	}
}

func (s *templateServiceImpl) CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.CreateTemplateRequest) (*models.DocumentTemplate, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Validaciones mínimas (podrías usar validator/v10 si quieres)
	if in.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if in.DocumentTypeID == "" {
		return nil, fmt.Errorf("document_type_id is required")
	}
	if in.FileID == "" {
		return nil, fmt.Errorf("file_id is required")
	}

	// Parse de UUIDs
	docTypeID, err := uuid.Parse(in.DocumentTypeID)
	if err != nil {
		return nil, fmt.Errorf("invalid document_type_id: %w", err)
	}

	fileID, err := uuid.Parse(in.FileID)
	if err != nil {
		return nil, fmt.Errorf("invalid file_id: %w", err)
	}

	// (Opcional) Verificar que el usuario exista
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("error checking user: %w", err)
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	template := &models.DocumentTemplate{
		// ID lo puede generar la DB (gen_random_uuid()) por el default
		Name:           in.Name,
		Description:    in.Description,
		DocumentTypeID: docTypeID,
		CategoryID:     in.CategoryID,
		FileID:         fileID,
		IsActive:       isActive,
		CreatedBy:      &userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.WithContext(ctx).Create(template).Error; err != nil {
		return nil, fmt.Errorf("error creating template: %w", err)
	}

	// Crear notificación
	notifType := "TEMPLATE" // o "DOCUMENT_TEMPLATE", lo que prefieras
	title := "Nueva plantilla creada"
	body := fmt.Sprintf("Se ha creado la plantilla '%s'.", template.Name)

	if err := s.noti.NotifyUser(ctx, userID, title, body, &notifType); err != nil {
		// Aquí decides: ¿si falla la notificación, fallas todo o solo logueas?
		// Por ahora devolvemos el error para verlo en desarrollo:
		return nil, fmt.Errorf("template created but failed to create notification: %w", err)
	}

	return template, nil

}
