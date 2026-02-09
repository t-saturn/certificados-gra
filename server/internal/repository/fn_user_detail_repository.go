package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"server/internal/domain/models"
)

type fnUserDetailRepository struct {
	db *gorm.DB
}

// NewFNUserDetailRepository creates a new FN user detail repository
func NewFNUserDetailRepository(db *gorm.DB) FNUserDetailRepository {
	return &fnUserDetailRepository{db: db}
}

func (r *fnUserDetailRepository) GetByNationalID(ctx context.Context, nationalID string) (*models.UserDetail, error) {
	var userDetail models.UserDetail
	err := r.db.WithContext(ctx).First(&userDetail, "national_id = ?", nationalID).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &userDetail, nil
}

func (r *fnUserDetailRepository) Create(ctx context.Context, userDetail *models.UserDetail) error {
	return r.db.WithContext(ctx).Create(userDetail).Error
}