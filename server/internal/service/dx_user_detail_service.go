package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type UserDetailService struct {
	repo repository.UserDetailRepository
}

func NewUserDetailService(repo repository.UserDetailRepository) *UserDetailService {
	return &UserDetailService{repo: repo}
}

func (s *UserDetailService) GetAll(ctx context.Context, limit, offset int) ([]models.UserDetail, int64, error) {
	details, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return details, total, nil
}

func (s *UserDetailService) GetByID(ctx context.Context, id uuid.UUID) (*models.UserDetail, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *UserDetailService) GetByNationalID(ctx context.Context, nationalID string) (*models.UserDetail, error) {
	return s.repo.GetByNationalID(ctx, nationalID)
}

func (s *UserDetailService) Create(ctx context.Context, detail *models.UserDetail) (*models.UserDetail, error) {
	if detail.ID == uuid.Nil {
		detail.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, detail); err != nil {
		return nil, err
	}

	return detail, nil
}

func (s *UserDetailService) Update(ctx context.Context, detail *models.UserDetail) (*models.UserDetail, error) {
	if err := s.repo.Update(ctx, detail); err != nil {
		return nil, err
	}

	return detail, nil
}

func (s *UserDetailService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}