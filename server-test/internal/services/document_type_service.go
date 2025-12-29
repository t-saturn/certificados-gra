package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentTypeService interface {
	CreateType(ctx context.Context, in dto.DocumentTypeCreateRequest) error
	ListTypes(ctx context.Context, params dto.DocumentTypeListQuery) (*dto.DocumentTypeListResponse, error)
	UpdateType(ctx context.Context, id uuid.UUID, in dto.DocumentTypeUpdateRequest) error
	DisableType(ctx context.Context, id uuid.UUID) error
	EnableType(ctx context.Context, id uuid.UUID) error
}

type documentTypeServiceImpl struct {
	db *gorm.DB
}

func NewDocumentTypeService(db *gorm.DB) DocumentTypeService {
	return &documentTypeServiceImpl{
		db: db,
	}
}

func (s *documentTypeServiceImpl) CreateType(ctx context.Context, in dto.DocumentTypeCreateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	docType := models.DocumentType{
		Code:        in.Code,
		Name:        in.Name,
		Description: in.Description,
		IsActive:    isActive,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.db.WithContext(ctx).Create(&docType).Error; err != nil {
		return fmt.Errorf("error creating document type: %w", err)
	}

	return nil
}

func (s *documentTypeServiceImpl) ListTypes(ctx context.Context, params dto.DocumentTypeListQuery) (*dto.DocumentTypeListResponse, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

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

	var types []models.DocumentType

	query := s.db.WithContext(ctx).
		Model(&models.DocumentType{}).
		Preload("Categories") // 👈 para traer categorías

	if params.IsActive != nil {
		query = query.Where("is_active = ?", *params.IsActive)
	}

	if params.SearchQuery != nil && *params.SearchQuery != "" {
		q := "%" + *params.SearchQuery + "%"
		query = query.Where("(code ILIKE ? OR name ILIKE ?)", q, q)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("error counting document types: %w", err)
	}

	if total == 0 {
		return &dto.DocumentTypeListResponse{
			Items: []dto.DocumentTypeListItem{},
			Pagination: dto.DocumentTypePagination{
				Page:        page,
				PageSize:    pageSize,
				TotalItems:  0,
				TotalPages:  0,
				HasPrevPage: page > 1,
				HasNextPage: false,
			},
			Filters: dto.DocumentTypeListFilters{
				SearchQuery: params.SearchQuery,
				IsActive:    params.IsActive,
			},
		}, nil
	}

	offset := (page - 1) * pageSize
	if err := query.
		Order("created_at DESC, id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&types).Error; err != nil {
		return nil, fmt.Errorf("error listing document types: %w", err)
	}

	items := make([]dto.DocumentTypeListItem, 0, len(types))
	for _, t := range types {
		// mapear categorías
		catItems := make([]dto.DocumentTypeCategoryItem, 0, len(t.Categories))
		for _, c := range t.Categories {
			catItems = append(catItems, dto.DocumentTypeCategoryItem{
				ID:       c.ID,
				Code:     c.Code,
				Name:     c.Name,
				IsActive: c.IsActive,
			})
		}

		items = append(items, dto.DocumentTypeListItem{
			ID:          t.ID,
			Code:        t.Code,
			Name:        t.Name,
			Description: t.Description,
			IsActive:    t.IsActive,
			CreatedAt:   t.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   t.UpdatedAt.Format(time.RFC3339),
			Categories:  catItems, // si no hay, queda []
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	hasNext := page < totalPages
	hasPrev := page > 1

	resp := &dto.DocumentTypeListResponse{
		Items: items,
		Pagination: dto.DocumentTypePagination{
			Page:        page,
			PageSize:    pageSize,
			TotalItems:  int(total),
			TotalPages:  totalPages,
			HasPrevPage: hasPrev,
			HasNextPage: hasNext,
		},
		Filters: dto.DocumentTypeListFilters{
			SearchQuery: params.SearchQuery,
			IsActive:    params.IsActive,
		},
	}

	return resp, nil
}

func (s *documentTypeServiceImpl) UpdateType(ctx context.Context, id uuid.UUID, in dto.DocumentTypeUpdateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var docType models.DocumentType
	if err := s.db.WithContext(ctx).
		First(&docType, "id = ?", id).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document type not found")
		}
		return fmt.Errorf("error fetching document type: %w", err)
	}

	if in.Code != nil {
		docType.Code = *in.Code
	}
	if in.Name != nil {
		docType.Name = *in.Name
	}
	if in.Description != nil {
		docType.Description = in.Description
	}
	if in.IsActive != nil {
		docType.IsActive = *in.IsActive
	}

	docType.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&docType).Error; err != nil {
		return fmt.Errorf("error updating document type: %w", err)
	}

	return nil
}

// helper interno reutilizable
func (s *documentTypeServiceImpl) setTypeActive(ctx context.Context, id uuid.UUID, active bool) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var docType models.DocumentType
	if err := s.db.WithContext(ctx).
		First(&docType, "id = ?", id).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document type not found")
		}
		return fmt.Errorf("error fetching document type: %w", err)
	}

	docType.IsActive = active
	docType.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&docType).Error; err != nil {
		return fmt.Errorf("error updating document type active state: %w", err)
	}

	return nil
}

func (s *documentTypeServiceImpl) DisableType(ctx context.Context, id uuid.UUID) error {
	return s.setTypeActive(ctx, id, false)
}

func (s *documentTypeServiceImpl) EnableType(ctx context.Context, id uuid.UUID) error {
	return s.setTypeActive(ctx, id, true)
}
