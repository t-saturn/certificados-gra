package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/dto"
	"server/internal/repository"
)

// FNDocumentTemplateService defines the interface for document template business logic
type FNDocumentTemplateService interface {
	Create(ctx context.Context, userID uuid.UUID, req dto.DocumentTemplateCreateRequest) (*dto.DocumentTemplateResponse, error)
	GetByID(ctx context.Context, id uuid.UUID) (*dto.DocumentTemplateResponse, error)
	GetByCode(ctx context.Context, code string) (*dto.DocumentTemplateResponse, error)
	List(ctx context.Context, params dto.DocumentTemplateListQuery) ([]dto.DocumentTemplateListItem, int64, error)
	Update(ctx context.Context, id uuid.UUID, req dto.DocumentTemplateUpdateRequest) (*dto.DocumentTemplateResponse, error)
	Enable(ctx context.Context, id uuid.UUID) error
	Disable(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type fnDocumentTemplateService struct {
	repo repository.FNDocumentTemplateRepository
}

// NewFNDocumentTemplateService creates a new FN document template service
func NewFNDocumentTemplateService(repo repository.FNDocumentTemplateRepository) FNDocumentTemplateService {
	return &fnDocumentTemplateService{repo: repo}
}

func (s *fnDocumentTemplateService) Create(ctx context.Context, userID uuid.UUID, req dto.DocumentTemplateCreateRequest) (*dto.DocumentTemplateResponse, error) {
	code := strings.TrimSpace(req.Code)
	if code == "" {
		return nil, fmt.Errorf("template code is required")
	}

	exists, err := s.repo.ExistsByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error checking template code: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("template with code '%s' already exists", code)
	}

	docType, err := s.repo.GetDocumentTypeByCode(ctx, req.DocTypeCode)
	if err != nil {
		return nil, fmt.Errorf("error fetching document type: %w", err)
	}
	if docType == nil {
		return nil, fmt.Errorf("document type with code '%s' not found", req.DocTypeCode)
	}

	var categoryID *uint
	if req.DocCategoryCode != nil && strings.TrimSpace(*req.DocCategoryCode) != "" {
		catCode := strings.TrimSpace(*req.DocCategoryCode)
		category, err := s.repo.GetCategoryByCodeAndTypeID(ctx, catCode, docType.ID)
		if err != nil {
			return nil, fmt.Errorf("error fetching category: %w", err)
		}
		if category == nil {
			return nil, fmt.Errorf("category with code '%s' not found for document type '%s'", catCode, req.DocTypeCode)
		}
		categoryID = &category.ID
	}

	fileID, err := uuid.Parse(req.FileID)
	if err != nil {
		return nil, fmt.Errorf("invalid file_id: must be a valid UUID")
	}
	prevFileID, err := uuid.Parse(req.PrevFileID)
	if err != nil {
		return nil, fmt.Errorf("invalid prev_file_id: must be a valid UUID")
	}

	now := time.Now().UTC()
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	template := &models.DocumentTemplate{
		ID:             uuid.New(),
		DocumentTypeID: docType.ID,
		CategoryID:     categoryID,
		Code:           code,
		Name:           strings.TrimSpace(req.Name),
		FileID:         fileID,
		PrevFileID:     prevFileID,
		IsActive:       isActive,
		CreatedBy:      &userID,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	var fields []models.DocumentTemplateField
	if len(req.Fields) > 0 {
		seen := make(map[string]struct{})
		for _, f := range req.Fields {
			key := strings.TrimSpace(f.Key)
			if key == "" {
				return nil, fmt.Errorf("field key is required")
			}
			if _, ok := seen[key]; ok {
				return nil, fmt.Errorf("duplicate field key: '%s'", key)
			}
			seen[key] = struct{}{}

			label := strings.TrimSpace(f.Label)
			if label == "" {
				return nil, fmt.Errorf("field label is required for key '%s'", key)
			}

			fieldType := "text"
			if f.FieldType != nil && strings.TrimSpace(*f.FieldType) != "" {
				fieldType = strings.TrimSpace(*f.FieldType)
			}

			required := false
			if f.Required != nil {
				required = *f.Required
			}

			fields = append(fields, models.DocumentTemplateField{
				ID:         uuid.New(),
				TemplateID: template.ID,
				Key:        key,
				Label:      label,
				FieldType:  fieldType,
				Required:   required,
				CreatedAt:  now,
				UpdatedAt:  now,
			})
		}
	}

	if err := s.repo.Create(ctx, template, fields); err != nil {
		return nil, fmt.Errorf("error creating template: %w", err)
	}

	created, err := s.repo.GetByID(ctx, template.ID)
	if err != nil {
		return nil, fmt.Errorf("error fetching created template: %w", err)
	}

	return s.toResponse(created), nil
}

func (s *fnDocumentTemplateService) GetByID(ctx context.Context, id uuid.UUID) (*dto.DocumentTemplateResponse, error) {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return nil, nil
	}
	return s.toResponse(template), nil
}

func (s *fnDocumentTemplateService) GetByCode(ctx context.Context, code string) (*dto.DocumentTemplateResponse, error) {
	template, err := s.repo.GetByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return nil, nil
	}
	return s.toResponse(template), nil
}

func (s *fnDocumentTemplateService) List(ctx context.Context, params dto.DocumentTemplateListQuery) ([]dto.DocumentTemplateListItem, int64, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 10
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}

	templates, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("error listing templates: %w", err)
	}

	items := make([]dto.DocumentTemplateListItem, 0, len(templates))
	for _, t := range templates {
		fieldsCount, _ := s.repo.CountFieldsByTemplateID(ctx, t.ID)

		item := dto.DocumentTemplateListItem{
			ID:               t.ID,
			Code:             t.Code,
			Name:             t.Name,
			FileID:           t.FileID.String(),
			PrevFileID:       t.PrevFileID.String(),
			IsActive:         t.IsActive,
			CreatedAt:        t.CreatedAt.Format(time.RFC3339),
			UpdatedAt:        t.UpdatedAt.Format(time.RFC3339),
			DocumentTypeID:   t.DocumentTypeID,
			DocumentTypeCode: t.DocumentType.Code,
			DocumentTypeName: t.DocumentType.Name,
			FieldsCount:      int(fieldsCount),
		}

		if t.CategoryID != nil {
			item.CategoryID = t.CategoryID
		}
		if t.Category != nil {
			item.CategoryCode = &t.Category.Code
			item.CategoryName = &t.Category.Name
		}

		items = append(items, item)
	}

	return items, total, nil
}

func (s *fnDocumentTemplateService) Update(ctx context.Context, id uuid.UUID, req dto.DocumentTemplateUpdateRequest) (*dto.DocumentTemplateResponse, error) {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return nil, fmt.Errorf("template not found")
	}

	now := time.Now().UTC()

	// update template fields
	if req.Code != nil {
		code := strings.TrimSpace(*req.Code)
		if code != "" && code != template.Code {
			exists, err := s.repo.ExistsByCodeExcludingID(ctx, code, id)
			if err != nil {
				return nil, fmt.Errorf("error checking code: %w", err)
			}
			if exists {
				return nil, fmt.Errorf("template with code '%s' already exists", code)
			}
			template.Code = code
		}
	}

	if req.Name != nil {
		template.Name = strings.TrimSpace(*req.Name)
	}

	if req.FileID != nil {
		fileID, err := uuid.Parse(*req.FileID)
		if err != nil {
			return nil, fmt.Errorf("invalid file_id")
		}
		template.FileID = fileID
	}

	if req.PrevFileID != nil {
		prevFileID, err := uuid.Parse(*req.PrevFileID)
		if err != nil {
			return nil, fmt.Errorf("invalid prev_file_id")
		}
		template.PrevFileID = prevFileID
	}

	if req.IsActive != nil {
		template.IsActive = *req.IsActive
	}

	template.UpdatedAt = now

	if err := s.repo.Update(ctx, template); err != nil {
		return nil, fmt.Errorf("error updating template: %w", err)
	}

	// process fields if provided
	if req.Fields != nil {
		if err := s.processFieldsUpdate(ctx, template.ID, req.Fields, now); err != nil {
			return nil, err
		}
	}

	updated, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("error fetching updated template: %w", err)
	}

	return s.toResponse(updated), nil
}

func (s *fnDocumentTemplateService) processFieldsUpdate(ctx context.Context, templateID uuid.UUID, fields []dto.DocumentTemplateFieldUpdateRequest, now time.Time) error {
	seenKeys := make(map[string]struct{})

	for _, f := range fields {
		key := strings.TrimSpace(f.Key)
		if key == "" {
			return fmt.Errorf("field key is required")
		}

		if _, ok := seenKeys[key]; ok {
			return fmt.Errorf("duplicate field key in request: '%s'", key)
		}
		seenKeys[key] = struct{}{}

		label := strings.TrimSpace(f.Label)
		if label == "" {
			return fmt.Errorf("field label is required for key '%s'", key)
		}

		fieldType := "text"
		if f.FieldType != nil && strings.TrimSpace(*f.FieldType) != "" {
			fieldType = strings.TrimSpace(*f.FieldType)
		}

		required := false
		if f.Required != nil {
			required = *f.Required
		}

		// delete field
		if f.Delete != nil && *f.Delete {
			if f.ID != nil && *f.ID != "" {
				fieldID, err := uuid.Parse(*f.ID)
				if err != nil {
					return fmt.Errorf("invalid field id for deletion")
				}
				if err := s.repo.DeleteField(ctx, fieldID); err != nil {
					return fmt.Errorf("error deleting field: %w", err)
				}
			}
			continue
		}

		// update existing field
		if f.ID != nil && *f.ID != "" {
			fieldID, err := uuid.Parse(*f.ID)
			if err != nil {
				return fmt.Errorf("invalid field id")
			}

			existingField, err := s.repo.GetFieldByID(ctx, fieldID)
			if err != nil {
				return fmt.Errorf("error fetching field: %w", err)
			}
			if existingField == nil {
				return fmt.Errorf("field with id '%s' not found", *f.ID)
			}

			// check key uniqueness excluding current field
			if key != existingField.Key {
				exists, err := s.repo.FieldExistsByKeyAndTemplateIDExcludingID(ctx, key, templateID, fieldID)
				if err != nil {
					return fmt.Errorf("error checking field key: %w", err)
				}
				if exists {
					return fmt.Errorf("field with key '%s' already exists in this template", key)
				}
			}

			existingField.Key = key
			existingField.Label = label
			existingField.FieldType = fieldType
			existingField.Required = required
			existingField.UpdatedAt = now

			if err := s.repo.UpdateField(ctx, existingField); err != nil {
				return fmt.Errorf("error updating field: %w", err)
			}
		} else {
			// create new field
			exists, err := s.repo.FieldExistsByKeyAndTemplateID(ctx, key, templateID)
			if err != nil {
				return fmt.Errorf("error checking field key: %w", err)
			}
			if exists {
				return fmt.Errorf("field with key '%s' already exists in this template", key)
			}

			newField := &models.DocumentTemplateField{
				ID:         uuid.New(),
				TemplateID: templateID,
				Key:        key,
				Label:      label,
				FieldType:  fieldType,
				Required:   required,
				CreatedAt:  now,
				UpdatedAt:  now,
			}

			if err := s.repo.CreateField(ctx, newField); err != nil {
				return fmt.Errorf("error creating field: %w", err)
			}
		}
	}

	return nil
}

func (s *fnDocumentTemplateService) Enable(ctx context.Context, id uuid.UUID) error {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return fmt.Errorf("template not found")
	}

	return s.repo.SetActive(ctx, id, true)
}

func (s *fnDocumentTemplateService) Disable(ctx context.Context, id uuid.UUID) error {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return fmt.Errorf("template not found")
	}

	return s.repo.SetActive(ctx, id, false)
}

func (s *fnDocumentTemplateService) Delete(ctx context.Context, id uuid.UUID) error {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("error fetching template: %w", err)
	}
	if template == nil {
		return fmt.Errorf("template not found")
	}

	return s.repo.Delete(ctx, id)
}

func (s *fnDocumentTemplateService) toResponse(t *models.DocumentTemplate) *dto.DocumentTemplateResponse {
	if t == nil {
		return nil
	}

	resp := &dto.DocumentTemplateResponse{
		ID:         t.ID,
		Code:       t.Code,
		Name:       t.Name,
		FileID:     t.FileID.String(),
		PrevFileID: t.PrevFileID.String(),
		IsActive:   t.IsActive,
		CreatedBy:  t.CreatedBy,
		CreatedAt:  t.CreatedAt,
		UpdatedAt:  t.UpdatedAt,
		DocumentType: dto.DocumentTypeEmbedded{
			ID:       t.DocumentType.ID,
			Code:     t.DocumentType.Code,
			Name:     t.DocumentType.Name,
			IsActive: t.DocumentType.IsActive,
		},
		Fields: make([]dto.DocumentTemplateFieldResponse, 0),
	}

	if t.Category != nil {
		resp.Category = &dto.DocumentCategoryEmbedded{
			ID:       t.Category.ID,
			Code:     t.Category.Code,
			Name:     t.Category.Name,
			IsActive: t.Category.IsActive,
		}
	}

	for _, f := range t.Fields {
		resp.Fields = append(resp.Fields, dto.DocumentTemplateFieldResponse{
			ID:        f.ID,
			Key:       f.Key,
			Label:     f.Label,
			FieldType: f.FieldType,
			Required:  f.Required,
			CreatedAt: f.CreatedAt,
			UpdatedAt: f.UpdatedAt,
		})
	}

	return resp
}