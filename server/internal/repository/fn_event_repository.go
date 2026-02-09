package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
	"server/internal/dto"
)

type fnEventRepository struct {
	db *gorm.DB
}

// NewFNEventRepository creates a new FN event repository
func NewFNEventRepository(db *gorm.DB) FNEventRepository {
	return &fnEventRepository{db: db}
}

func (r *fnEventRepository) Create(ctx context.Context, event *models.Event, schedules []models.EventSchedule, participants []models.EventParticipant) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(event).Error; err != nil {
			return err
		}

		if len(schedules) > 0 {
			for i := range schedules {
				schedules[i].EventID = event.ID
			}
			if err := tx.Create(&schedules).Error; err != nil {
				return err
			}
		}

		if len(participants) > 0 {
			for i := range participants {
				participants[i].EventID = event.ID
			}
			if err := tx.Create(&participants).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *fnEventRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	var event models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		Preload("EventParticipants").
		Preload("EventParticipants.UserDetail").
		Preload("User").
		First(&event, "id = ?", id).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *fnEventRepository) GetByCode(ctx context.Context, code string) (*models.Event, error) {
	var event models.Event
	err := r.db.WithContext(ctx).
		Preload("Template").
		Preload("Schedules").
		Preload("EventParticipants").
		Preload("EventParticipants.UserDetail").
		First(&event, "code = ?", code).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *fnEventRepository) List(ctx context.Context, params dto.EventListQuery) ([]models.Event, int64, error) {
	var events []models.Event
	var total int64

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	query := r.db.WithContext(ctx).Model(&models.Event{})

	// filters
	if params.IsPublic != nil {
		query = query.Where("events.is_public = ?", *params.IsPublic)
	}

	if params.Status != nil && strings.TrimSpace(*params.Status) != "" {
		query = query.Where("events.status = ?", strings.TrimSpace(*params.Status))
	}

	if params.SearchQuery != nil && strings.TrimSpace(*params.SearchQuery) != "" {
		q := "%" + strings.TrimSpace(*params.SearchQuery) + "%"
		query = query.Where("events.title ILIKE ? OR events.code ILIKE ?", q, q)
	}

	if params.TemplateID != nil && strings.TrimSpace(*params.TemplateID) != "" {
		templateID, err := uuid.Parse(*params.TemplateID)
		if err == nil {
			query = query.Where("events.template_id = ?", templateID)
		}
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.Event{}, 0, nil
	}

	offset := (page - 1) * pageSize

	err := r.db.WithContext(ctx).
		Preload("Template").
		Where(query).
		Order("events.created_at DESC, events.id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&events).Error

	if err != nil {
		return nil, 0, err
	}

	return events, total, nil
}

func (r *fnEventRepository) Update(ctx context.Context, event *models.Event) error {
	return r.db.WithContext(ctx).Save(event).Error
}

func (r *fnEventRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Event{}, "id = ?", id).Error
}

func (r *fnEventRepository) ExistsByCode(ctx context.Context, code string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Event{}).
		Where("code = ?", code).
		Count(&count).Error
	return count > 0, err
}

func (r *fnEventRepository) ExistsByCodeExcludingID(ctx context.Context, code string, excludeID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Event{}).
		Where("code = ? AND id != ?", code, excludeID).
		Count(&count).Error
	return count > 0, err
}

func (r *fnEventRepository) CountParticipantsByEventID(ctx context.Context, eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EventParticipant{}).
		Where("event_id = ?", eventID).
		Count(&count).Error
	return count, err
}

func (r *fnEventRepository) CountSchedulesByEventID(ctx context.Context, eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.EventSchedule{}).
		Where("event_id = ?", eventID).
		Count(&count).Error
	return count, err
}