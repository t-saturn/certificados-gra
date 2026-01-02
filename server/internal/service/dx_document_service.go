package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type DocumentService struct {
	repo repository.DocumentRepository
}

func NewDocumentService(repo repository.DocumentRepository) *DocumentService {
	return &DocumentService{repo: repo}
}

func (s *DocumentService) GetAll(ctx context.Context, limit, offset int) ([]models.Document, int64, error) {
	docs, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return docs, total, nil
}

func (s *DocumentService) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DocumentService) GetBySerialCode(ctx context.Context, serialCode string) (*models.Document, error) {
	return s.repo.GetBySerialCode(ctx, serialCode)
}

func (s *DocumentService) GetByVerificationCode(ctx context.Context, verificationCode string) (*models.Document, error) {
	return s.repo.GetByVerificationCode(ctx, verificationCode)
}

func (s *DocumentService) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.Document, error) {
	return s.repo.GetByEventID(ctx, eventID)
}

func (s *DocumentService) GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.Document, error) {
	return s.repo.GetByUserDetailID(ctx, userDetailID)
}

func (s *DocumentService) Create(ctx context.Context, doc *models.Document) (*models.Document, error) {
	if doc.ID == uuid.Nil {
		doc.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, doc); err != nil {
		return nil, err
	}

	return doc, nil
}

func (s *DocumentService) Update(ctx context.Context, doc *models.Document) (*models.Document, error) {
	if err := s.repo.Update(ctx, doc); err != nil {
		return nil, err
	}

	return doc, nil
}

func (s *DocumentService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}