package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type studyMaterialRepository struct {
	db *gorm.DB
}

// NewStudyMaterialRepository creates a new study material repository
func NewStudyMaterialRepository(db *gorm.DB) StudyMaterialRepository {
	return &studyMaterialRepository{db: db}
}

func (r *studyMaterialRepository) Create(ctx context.Context, material *models.StudyMaterial) error {
	return r.db.WithContext(ctx).Create(material).Error
}

func (r *studyMaterialRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.StudyMaterial, error) {
	var material models.StudyMaterial
	err := r.db.WithContext(ctx).
		Preload("Sections.Subsections.Resources").
		Preload("Sections.Subsections.Notes").
		Preload("Sections.Subsections.Progresses").
		First(&material, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &material, err
}

func (r *studyMaterialRepository) GetAll(ctx context.Context, limit, offset int) ([]models.StudyMaterial, error) {
	var materials []models.StudyMaterial
	err := r.db.WithContext(ctx).
		Preload("Sections").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&materials).Error
	return materials, err
}

func (r *studyMaterialRepository) Update(ctx context.Context, material *models.StudyMaterial) error {
	return r.db.WithContext(ctx).Save(material).Error
}

func (r *studyMaterialRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.StudyMaterial{}, "id = ?", id).Error
}

func (r *studyMaterialRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.StudyMaterial{}).Count(&count).Error
	return count, err
}
