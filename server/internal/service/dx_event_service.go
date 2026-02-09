package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type EventService struct {
	repo repository.EventRepository
}

func NewEventService(repo repository.EventRepository) *EventService {
	return &EventService{repo: repo}
}

func (s *EventService) GetAll(ctx context.Context, limit, offset int) ([]models.Event, int64, error) {
	events, err := s.repo.GetAll(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

func (s *EventService) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EventService) GetByCode(ctx context.Context, code string) (*models.Event, error) {
	return s.repo.GetByCode(ctx, code)
}

func (s *EventService) GetByStatus(ctx context.Context, status string) ([]models.Event, error) {
	return s.repo.GetByStatus(ctx, status)
}

func (s *EventService) GetPublic(ctx context.Context, limit, offset int) ([]models.Event, int64, error) {
	events, err := s.repo.GetPublic(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

func (s *EventService) Create(ctx context.Context, event *models.Event) (*models.Event, error) {
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, event); err != nil {
		return nil, err
	}

	return event, nil
}

func (s *EventService) Update(ctx context.Context, event *models.Event) (*models.Event, error) {
	if err := s.repo.Update(ctx, event); err != nil {
		return nil, err
	}

	return event, nil
}

func (s *EventService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}