package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type eventRepository struct {
	db *gorm.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepository{db: db}
}

func (r *eventRepository) Create(ctx context.Context, event *models.Event) error {
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *eventRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	var event models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("User").
		Preload("Schedules").
		First(&event, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &event, err
}

func (r *eventRepository) GetByCode(ctx context.Context, code string) (*models.Event, error) {
	var event models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		First(&event, "code = ?", code).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &event, err
}

func (r *eventRepository) GetAll(ctx context.Context, limit, offset int) ([]models.Event, error) {
	var events []models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&events).Error
	return events, err
}

func (r *eventRepository) GetByStatus(ctx context.Context, status string) ([]models.Event, error) {
	var events []models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		Where("status = ?", status).
		Order("created_at DESC").
		Find(&events).Error
	return events, err
}

func (r *eventRepository) GetPublic(ctx context.Context, limit, offset int) ([]models.Event, error) {
	var events []models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		Where("is_public = ?", true).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&events).Error
	return events, err
}

func (r *eventRepository) Update(ctx context.Context, event *models.Event) error {
	return r.db.WithContext(ctx).Save(event).Error
}

func (r *eventRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Event{}, "id = ?", id).Error
}

func (r *eventRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Event{}).Count(&count).Error
	return count, err
}
