package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type DocumentTemplateService struct {
	repo repository.DocumentTemplateRepository
}

func NewDocumentTemplateService(repo repository.DocumentTemplateRepository) *DocumentTemplateService {
	return &DocumentTemplateService{repo: repo}
}

func (s *DocumentTemplateService) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentTemplate, int64, error) {
	templates, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return templates, total, nil
}

func (s *DocumentTemplateService) GetAllActive(ctx context.Context) ([]models.DocumentTemplate, error) {
	return s.repo.GetAllActive(ctx)
}

func (s *DocumentTemplateService) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentTemplate, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentTemplateService) GetByDocumentTypeID(ctx context.Context, docTypeID uuid.UUID) ([]models.DocumentTemplate, error) {
	return s.repo.GetByDocumentTypeID(ctx, docTypeID)
}

func (s *DocumentTemplateService) Create(ctx context.Context, template *models.DocumentTemplate) (*models.DocumentTemplate, error) {
	if template.ID == uuid.Nil {
		template.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *DocumentTemplateService) Update(ctx context.Context, template *models.DocumentTemplate) (*models.DocumentTemplate, error) {
	if err := s.repo.Update(ctx, template); err != nil {
		return nil, err
	}

	return template, nil
}

func (s *DocumentTemplateService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}