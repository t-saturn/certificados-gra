package repositories

import (
	"context"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentTemplateFieldRepository interface {
	GetByTemplateID(ctx context.Context, templateID uuid.UUID) ([]models.DocumentTemplateField, error)
}

type documentTemplateFieldRepositoryImpl struct {
	db *gorm.DB
}

func NewDocumentTemplateFieldRepository(db *gorm.DB) DocumentTemplateFieldRepository {
	return &documentTemplateFieldRepositoryImpl{db: db}
}

func (r *documentTemplateFieldRepositoryImpl) GetByTemplateID(
	ctx context.Context,
	templateID uuid.UUID,
) ([]models.DocumentTemplateField, error) {
	var out []models.DocumentTemplateField
	err := r.db.WithContext(ctx).
		Where("template_id = ?", templateID).
		Order("created_at ASC").
		Find(&out).Error
	return out, err
}
