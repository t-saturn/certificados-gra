package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type EventParticipantService struct {
	repo repository.EventParticipantRepository
}

func NewEventParticipantService(repo repository.EventParticipantRepository) *EventParticipantService {
	return &EventParticipantService{repo: repo}
}

func (s *EventParticipantService) GetByID(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EventParticipantService) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.EventParticipant, int64, error) {
	participants, err := s.repo.GetByEventID(ctx, eventID)
	if err != nil {
		return nil, 0, err
	}
	count, err := s.repo.CountByEventID(ctx, eventID)
	if err != nil {
		return nil, 0, err
	}
	return participants, count, nil
}

func (s *EventParticipantService) GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.EventParticipant, error) {
	return s.repo.GetByUserDetailID(ctx, userDetailID)
}

func (s *EventParticipantService) Create(ctx context.Context, participant *models.EventParticipant) (*models.EventParticipant, error) {
	if participant.ID == uuid.Nil {
		participant.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, participant); err != nil {
		return nil, err
	}

	return participant, nil
}

func (s *EventParticipantService) Update(ctx context.Context, participant *models.EventParticipant) (*models.EventParticipant, error) {
	if err := s.repo.Update(ctx, participant); err != nil {
		return nil, err
	}

	return participant, nil
}

func (s *EventParticipantService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *EventParticipantService) Count(ctx context.Context) (int64, error) {
	return s.repo.Count(ctx)
}

func (s *EventParticipantService) CountByEventID(ctx context.Context, eventID uuid.UUID) (int64, error) {
	return s.repo.CountByEventID(ctx, eventID)
}