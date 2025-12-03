package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"gorm.io/gorm"
)

type DocumentCategoryService interface {
	CreateCategory(ctx context.Context, in dto.DocumentCategoryCreateRequest) error
	ListCategories(ctx context.Context, params dto.DocumentCategoryListQuery) (*dto.DocumentCategoryListResponse, error)
	UpdateCategory(ctx context.Context, id uint, in dto.DocumentCategoryUpdateRequest) error
	SoftDeleteCategory(ctx context.Context, id uint) error
	EnableCategory(ctx context.Context, id uint) error
}

type documentCategoryServiceImpl struct {
	db *gorm.DB
}

func NewDocumentCategoryService(db *gorm.DB) DocumentCategoryService {
	return &documentCategoryServiceImpl{
		db: db,
	}
}

func (s *documentCategoryServiceImpl) CreateCategory(ctx context.Context, in dto.DocumentCategoryCreateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	// 1) Buscar el document_type por code
	var docType models.DocumentType
	if err := s.db.WithContext(ctx).
		Where("code = ?", in.DocTypeCode).
		First(&docType).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document type with code '%s' not found", in.DocTypeCode)
		}
		return fmt.Errorf("error fetching document type: %w", err)
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	category := models.DocumentCategory{
		DocumentTypeID: docType.ID,
		Code:           in.Code,
		Name:           in.Name,
		Description:    in.Description,
		IsActive:       isActive,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.WithContext(ctx).Create(&category).Error; err != nil {
		return fmt.Errorf("error creating document category: %w", err)
	}

	return nil
}

func (s *documentCategoryServiceImpl) ListCategories(ctx context.Context, params dto.DocumentCategoryListQuery) (*dto.DocumentCategoryListResponse, error) {
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

	var categories []models.DocumentCategory

	query := s.db.WithContext(ctx).
		Model(&models.DocumentCategory{})

	// Si queremos filtrar por tipo, unimos con document_types
	if (params.DocTypeCode != nil && *params.DocTypeCode != "") ||
		(params.DocTypeName != nil && *params.DocTypeName != "") {
		query = query.Joins("JOIN document_types dt ON dt.id = document_categories.document_type_id")
	}

	if params.IsActive != nil {
		query = query.Where("document_categories.is_active = ?", *params.IsActive)
	}

	if params.SearchQuery != nil && *params.SearchQuery != "" {
		q := "%" + *params.SearchQuery + "%"
		query = query.Where("(document_categories.code ILIKE ? OR document_categories.name ILIKE ?)", q, q)
	}

	if params.DocTypeCode != nil && *params.DocTypeCode != "" {
		query = query.Where("dt.code = ?", *params.DocTypeCode)
	}

	if params.DocTypeName != nil && *params.DocTypeName != "" {
		nameLike := "%" + *params.DocTypeName + "%"
		query = query.Where("dt.name ILIKE ?", nameLike)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("error counting document categories: %w", err)
	}

	if total == 0 {
		return &dto.DocumentCategoryListResponse{
			Items: []dto.DocumentCategoryListItem{},
			Pagination: dto.DocumentCategoryPagination{
				Page:        page,
				PageSize:    pageSize,
				TotalItems:  0,
				TotalPages:  0,
				HasPrevPage: page > 1,
				HasNextPage: false,
			},
			Filters: dto.DocumentCategoryListFilters{
				SearchQuery: params.SearchQuery,
				IsActive:    params.IsActive,
				DocTypeCode: params.DocTypeCode,
				DocTypeName: params.DocTypeName,
			},
		}, nil
	}

	offset := (page - 1) * pageSize
	if err := query.
		Order("document_categories.created_at DESC, document_categories.id ASC").
		Offset(offset).
		Limit(pageSize).
		Find(&categories).Error; err != nil {
		return nil, fmt.Errorf("error listing document categories: %w", err)
	}

	items := make([]dto.DocumentCategoryListItem, 0, len(categories))
	for _, c := range categories {
		items = append(items, dto.DocumentCategoryListItem{
			ID:          c.ID,
			Code:        c.Code,
			Name:        c.Name,
			Description: c.Description,
			IsActive:    c.IsActive,
			CreatedAt:   c.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   c.UpdatedAt.Format(time.RFC3339),
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	hasNext := page < totalPages
	hasPrev := page > 1

	resp := &dto.DocumentCategoryListResponse{
		Items: items,
		Pagination: dto.DocumentCategoryPagination{
			Page:        page,
			PageSize:    pageSize,
			TotalItems:  int(total),
			TotalPages:  totalPages,
			HasPrevPage: hasPrev,
			HasNextPage: hasNext,
		},
		Filters: dto.DocumentCategoryListFilters{
			SearchQuery: params.SearchQuery,
			IsActive:    params.IsActive,
			DocTypeCode: params.DocTypeCode,
			DocTypeName: params.DocTypeName,
		},
	}

	return resp, nil
}

func (s *documentCategoryServiceImpl) UpdateCategory(ctx context.Context, id uint, in dto.DocumentCategoryUpdateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var category models.DocumentCategory
	if err := s.db.WithContext(ctx).
		First(&category, "id = ?", id).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document category not found")
		}
		return fmt.Errorf("error fetching document category: %w", err)
	}

	// IMPORTANTE: NO tocar DocumentTypeID (type)
	if in.Code != nil {
		category.Code = *in.Code
	}
	if in.Name != nil {
		category.Name = *in.Name
	}
	if in.Description != nil {
		category.Description = in.Description
	}
	if in.IsActive != nil {
		category.IsActive = *in.IsActive
	}

	category.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&category).Error; err != nil {
		return fmt.Errorf("error updating document category: %w", err)
	}

	return nil
}

func (s *documentCategoryServiceImpl) SoftDeleteCategory(ctx context.Context, id uint) error {
	// is_active = false
	return s.setCategoryActive(ctx, id, false)
}

func (s *documentCategoryServiceImpl) EnableCategory(ctx context.Context, id uint) error {
	// is_active = true
	return s.setCategoryActive(ctx, id, true)
}

func (s *documentCategoryServiceImpl) setCategoryActive(ctx context.Context, id uint, active bool) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var category models.DocumentCategory
	if err := s.db.WithContext(ctx).
		First(&category, "id = ?", id).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document category not found")
		}
		return fmt.Errorf("error fetching document category: %w", err)
	}

	category.IsActive = active
	category.UpdatedAt = time.Now().UTC()

	if err := s.db.WithContext(ctx).Save(&category).Error; err != nil {
		return fmt.Errorf("error updating document category active state: %w", err)
	}

	return nil
}
