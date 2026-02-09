package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"server/internal/domain/models"
)

type userDetailRepository struct {
	db *gorm.DB
}

// NewUserDetailRepository creates a new user detail repository
func NewUserDetailRepository(db *gorm.DB) UserDetailRepository {
	return &userDetailRepository{db: db}
}

func (r *userDetailRepository) Create(ctx context.Context, detail *models.UserDetail) error {
	return r.db.WithContext(ctx).Create(detail).Error
}

func (r *userDetailRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.UserDetail, error) {
	var detail models.UserDetail
	err := r.db.WithContext(ctx).First(&detail, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &detail, err
}

func (r *userDetailRepository) GetByNationalID(ctx context.Context, nationalID string) (*models.UserDetail, error) {
	var detail models.UserDetail
	err := r.db.WithContext(ctx).First(&detail, "national_id = ?", nationalID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &detail, err
}

func (r *userDetailRepository) GetAll(ctx context.Context, limit, offset int) ([]models.UserDetail, error) {
	var details []models.UserDetail
	err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&details).Error
	return details, err
}

func (r *userDetailRepository) Update(ctx context.Context, detail *models.UserDetail) error {
	return r.db.WithContext(ctx).Save(detail).Error
}

func (r *userDetailRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.UserDetail{}, "id = ?", id).Error
}

func (r *userDetailRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.UserDetail{}).Count(&count).Error
	return count, err
}