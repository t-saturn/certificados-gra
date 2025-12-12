package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationService interface {
	NotifyUser(ctx context.Context, userID uuid.UUID, title, body string, notifType *string) error
}

type notificationServiceImpl struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) NotificationService {
	return &notificationServiceImpl{db: db}
}

func (s *notificationServiceImpl) NotifyUser(
	ctx context.Context,
	userID uuid.UUID,
	title, body string,
	notifType *string,
) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	now := time.Now().UTC()
	n := models.Notification{
		UserID:           userID,
		Title:            title,
		Body:             body,
		NotificationType: notifType,
		IsRead:           false,
		CreatedAt:        now,
	}

	return s.db.WithContext(ctx).Create(&n).Error
}
