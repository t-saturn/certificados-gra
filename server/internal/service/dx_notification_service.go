package service

import (
	"context"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/repository"
)

type NotificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) GetByID(ctx context.Context, id uuid.UUID) (*models.Notification, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *NotificationService) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Notification, int64, error) {
	notifications, err := s.repo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.CountUnreadByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return notifications, total, nil
}

func (s *NotificationService) GetUnreadByUserID(ctx context.Context, userID uuid.UUID) ([]models.Notification, int64, error) {
	notifications, err := s.repo.GetUnreadByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	count, err := s.repo.CountUnreadByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	return notifications, count, nil
}

func (s *NotificationService) Create(ctx context.Context, notification *models.Notification) (*models.Notification, error) {
	if notification.ID == uuid.Nil {
		notification.ID = uuid.New()
	}

	if err := s.repo.Create(ctx, notification); err != nil {
		return nil, err
	}

	return notification, nil
}

func (s *NotificationService) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	return s.repo.MarkAsRead(ctx, id)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID uuid.UUID) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}

func (s *NotificationService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *NotificationService) CountUnreadByUserID(ctx context.Context, userID uuid.UUID) (int64, error) {
	return s.repo.CountUnreadByUserID(ctx, userID)
}
