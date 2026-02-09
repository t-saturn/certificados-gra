package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type EvaluationService struct {
	repo repository.EvaluationRepository
}

func NewEvaluationService(repo repository.EvaluationRepository) *EvaluationService {
	return &EvaluationService{repo: repo}
}

func (s *EvaluationService) GetAll(ctx context.Context, limit, offset int) ([]models.Evaluation, int64, error) {
	evaluations, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return evaluations, total, nil
}

func (s *EvaluationService) GetByID(ctx context.Context, id uuid.UUID) (*models.Evaluation, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EvaluationService) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.Evaluation, error) {
	return s.repo.GetByUserID(ctx, userID)
}

func (s *EvaluationService) Create(ctx context.Context, evaluation *models.Evaluation) (*models.Evaluation, error) {
	if evaluation.ID == uuid.Nil {
		evaluation.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, evaluation); err != nil {
		return nil, err
	}

	return evaluation, nil
}

func (s *EvaluationService) Update(ctx context.Context, evaluation *models.Evaluation) (*models.Evaluation, error) {
	if err := s.repo.Update(ctx, evaluation); err != nil {
		return nil, err
	}

	return evaluation, nil
}

func (s *EvaluationService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
