package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type eventParticipantRepository struct {
	db *gorm.DB
}

// NewEventParticipantRepository creates a new event participant repository
func NewEventParticipantRepository(db *gorm.DB) EventParticipantRepository {
	return &eventParticipantRepository{db: db}
}

func (r *eventParticipantRepository) Create(ctx context.Context, participant *models.EventParticipant) error {
	return r.db.WithContext(ctx).Create(participant).Error
}

func (r *eventParticipantRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.EventParticipant, error) {
	var participant models.EventParticipant
	err := r.db.WithContext(ctx).
		Preload("Event").
		Preload("UserDetail").
		First(&participant, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &participant, err
}

func (r *eventParticipantRepository) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.EventParticipant, error) {
	var participants []models.EventParticipant
	err := r.db.WithContext(ctx).
		Preload("UserDetail").
		Where("event_id = ?", eventID).
		Order("created_at DESC").
		Find(&participants).Error
	return participants, err
}

func (r *eventParticipantRepository) GetByUserDetailID(ctx context.Context, userDetailID uuid.UUID) ([]models.EventParticipant, error) {
	var participants []models.EventParticipant
	err := r.db.WithContext(ctx).
		Preload("Event").
		Where("user_detail_id = ?", userDetailID).
		Order("created_at DESC").
		Find(&participants).Error
	return participants, err
}

func (r *eventParticipantRepository) Update(ctx context.Context, participant *models.EventParticipant) error {
	return r.db.WithContext(ctx).Save(participant).Error
}

func (r *eventParticipantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.EventParticipant{}, "id = ?", id).Error
}

func (r *eventParticipantRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.EventParticipant{}).Count(&count).Error
	return count, err
}

func (r *eventParticipantRepository) CountByEventID(ctx context.Context, eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EventParticipant{}).
		Where("event_id = ?", eventID).
		Count(&count).Error
	return count, err
}