package repositories

import (
	"context"

	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserDetailRepository interface {
	GetByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]models.UserDetail, error)
}

type userDetailRepositoryImpl struct {
	db *gorm.DB
}

func NewUserDetailRepository(db *gorm.DB) UserDetailRepository {
	return &userDetailRepositoryImpl{db: db}
}

func (r *userDetailRepositoryImpl) GetByIDs(
	ctx context.Context,
	ids []uuid.UUID,
) (map[uuid.UUID]models.UserDetail, error) {
	if len(ids) == 0 {
		return map[uuid.UUID]models.UserDetail{}, nil
	}

	var rows []models.UserDetail
	if err := r.db.WithContext(ctx).
		Where("id IN ?", ids).
		Find(&rows).Error; err != nil {
		return nil, err
	}

	out := make(map[uuid.UUID]models.UserDetail, len(rows))
	for _, r := range rows {
		out[r.ID] = r
	}
	return out, nil
}
