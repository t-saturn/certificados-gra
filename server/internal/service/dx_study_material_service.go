package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type StudyMaterialService struct {
	repo repository.StudyMaterialRepository
}

func NewStudyMaterialService(repo repository.StudyMaterialRepository) *StudyMaterialService {
	return &StudyMaterialService{repo: repo}
}

func (s *StudyMaterialService) GetAll(ctx context.Context, limit, offset int) ([]models.StudyMaterial, int64, error) {
	materials, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return materials, total, nil
}

func (s *StudyMaterialService) GetByID(ctx context.Context, id uuid.UUID) (*models.StudyMaterial, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *StudyMaterialService) Create(ctx context.Context, material *models.StudyMaterial) (*models.StudyMaterial, error) {
	if material.ID == uuid.Nil {
		material.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, material); err != nil {
		return nil, err
	}

	return material, nil
}

func (s *StudyMaterialService) Update(ctx context.Context, material *models.StudyMaterial) (*models.StudyMaterial, error) {
	if err := s.repo.Update(ctx, material); err != nil {
		return nil, err
	}

	return material, nil
}

func (s *StudyMaterialService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
