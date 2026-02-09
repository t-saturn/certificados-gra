package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type DocumentCategoryService struct {
	repo repository.DocumentCategoryRepository
}

func NewDocumentCategoryService(repo repository.DocumentCategoryRepository) *DocumentCategoryService {
	return &DocumentCategoryService{repo: repo}
}

func (s *DocumentCategoryService) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentCategory, int64, error) {
	categories, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return categories, total, nil
}

func (s *DocumentCategoryService) GetByID(ctx context.Context, id uint) (*models.DocumentCategory, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentCategoryService) GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentCategory, error) {
	return s.repo.GetByDocumentTypeID(ctx, docTypeID)
}

func (s *DocumentCategoryService) Create(ctx context.Context, category *models.DocumentCategory) (*models.DocumentCategory, error) {
	if err := s.repo.Create(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *DocumentCategoryService) Update(ctx context.Context, category *models.DocumentCategory) (*models.DocumentCategory, error) {
	if err := s.repo.Update(ctx, category); err != nil {
		return nil, err
	}
	return category, nil
}

func (s *DocumentCategoryService) Delete(ctx context.Context, id uint) error {
	return s.repo.Delete(ctx, id)
}