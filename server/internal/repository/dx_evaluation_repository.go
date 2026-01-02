package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type evaluationRepository struct {
	db *gorm.DB
}

// NewEvaluationRepository creates a new evaluation repository
func NewEvaluationRepository(db *gorm.DB) EvaluationRepository {
	return &evaluationRepository{db: db}
}

func (r *evaluationRepository) Create(ctx context.Context, evaluation *models.Evaluation) error {
	return r.db.WithContext(ctx).Create(evaluation).Error
}

func (r *evaluationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Evaluation, error) {
	var evaluation models.Evaluation
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Document").
		Preload("Questions").
		Preload("Answers").
		Preload("Scores").
		Preload("Docs").
		First(&evaluation, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &evaluation, err
}

func (r *evaluationRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Evaluation, error) {
	var evaluations []models.Evaluation
	err := r.db.WithContext(ctx).
		Preload("Document").
		Preload("Questions").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&evaluations).Error
	return evaluations, err
}

func (r *evaluationRepository) GetAll(ctx context.Context, limit, offset int) ([]models.Evaluation, error) {
	var evaluations []models.Evaluation
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Document").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&evaluations).Error
	return evaluations, err
}

func (r *evaluationRepository) Update(ctx context.Context, evaluation *models.Evaluation) error {
	return r.db.WithContext(ctx).Save(evaluation).Error
}

func (r *evaluationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Evaluation{}, "id = ?", id).Error
}

func (r *evaluationRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Evaluation{}).Count(&count).Error
	return count, err
}
