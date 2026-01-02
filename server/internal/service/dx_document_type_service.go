package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type DocumentTypeService struct {
	repo repository.DocumentTypeRepository
}

func NewDocumentTypeService(repo repository.DocumentTypeRepository) *DocumentTypeService {
	return &DocumentTypeService{repo: repo}
}

func (s *DocumentTypeService) GetAll(ctx context.Context, limit, offset int) ([]models.DocumentType, int64, error) {
	docTypes, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return docTypes, total, nil
}

func (s *DocumentTypeService) GetActive(ctx context.Context) ([]models.DocumentType, error) {
	return s.repo.GetAllActive(ctx)
}

func (s *DocumentTypeService) GetByID(ctx context.Context, id uuid.UUID) (*models.DocumentType, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentTypeService) GetByCode(ctx context.Context, code string) (*models.DocumentType, error) {
	return s.repo.GetByCode(ctx, code)
}

func (s *DocumentTypeService) Create(ctx context.Context, docType *models.DocumentType) (*models.DocumentType, error) {
	if docType.ID == uuid.Nil {
		docType.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, docType); err != nil {
		return nil, err
	}

	return docType, nil
}

func (s *DocumentTypeService) Update(ctx context.Context, docType *models.DocumentType) (*models.DocumentType, error) {
	if err := s.repo.Update(ctx, docType); err != nil {
		return nil, err
	}

	return docType, nil
}

func (s *DocumentTypeService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
