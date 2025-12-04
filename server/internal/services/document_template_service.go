package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/dto"
	"server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentTemplateService interface {
	CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.DocumentTemplateCreateRequest) error
}

type documentTemplateServiceImpl struct {
	db *gorm.DB
}

func NewDocumentTemplateService(db *gorm.DB) DocumentTemplateService {
	return &documentTemplateServiceImpl{db: db}
}

func (s *documentTemplateServiceImpl) CreateTemplate(ctx context.Context, userID uuid.UUID, in dto.DocumentTemplateCreateRequest) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	var docType models.DocumentType
	if err := s.db.WithContext(ctx).
		Where("code = ?", in.DocTypeCode).
		First(&docType).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document type with code '%s' not found", in.DocTypeCode)
		}
		return fmt.Errorf("error fetching document type: %w", err)
	}

	fileID, err := uuid.Parse(in.FileID)
	if err != nil {
		return fmt.Errorf("invalid file_id")
	}

	prevFileID, err := uuid.Parse(in.PrevFileID)
	if err != nil {
		return fmt.Errorf("invalid prev_file_id")
	}

	now := time.Now().UTC()
	isActive := true
	if in.IsActive != nil {
		isActive = *in.IsActive
	}

	template := models.DocumentTemplate{
		DocumentTypeID: docType.ID,
		Code:           in.Code,
		Name:           in.Name,
		Description:    in.Description,
		CategoryID:     in.CategoryID,
		FileID:         fileID,
		PrevFileID:     prevFileID,
		IsActive:       isActive,
		CreatedBy:      &userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.WithContext(ctx).Create(&template).Error; err != nil {
		return fmt.Errorf("error creating document template: %w", err)
	}

	return nil
}
