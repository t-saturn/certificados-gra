package handlers

import (
	"context"
	"strconv"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type DocumentTemplateHandler struct {
	service services.DocumentTemplateService
}

func NewDocumentTemplateHandler(service services.DocumentTemplateService) *DocumentTemplateHandler {
	return &DocumentTemplateHandler{service: service}
}

// POST /template?user_id=<uuid>
func (h *DocumentTemplateHandler) CreateTemplate(c fiber.Ctx) (interface{}, string, error) {
	userIDStr := strings.TrimSpace(c.Query("user_id"))
	if userIDStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid user_id")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid user_id")
	}

	var in dto.DocumentTemplateCreateRequest
	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	in.DocTypeCode = strings.TrimSpace(in.DocTypeCode)
	if in.DocCategoryCode != nil {
		trimmed := strings.TrimSpace(*in.DocCategoryCode)
		in.DocCategoryCode = &trimmed
	}
	in.Code = strings.TrimSpace(in.Code)
	in.Name = strings.TrimSpace(in.Name)

	if in.DocTypeCode == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "doc_type_code is required")
	}
	if in.Code == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "code is required")
	}
	if in.Name == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "name is required")
	}
	if strings.TrimSpace(in.FileID) == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "file_id is required")
	}
	if strings.TrimSpace(in.PrevFileID) == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "prev_file_id is required")
	}

	ctx := context.Background()
	if err := h.service.CreateTemplate(ctx, userID, in); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document template created successfully",
	}, "ok", nil
}

// GET /templates
func (h *DocumentTemplateHandler) ListTemplates(c fiber.Ctx) (interface{}, string, error) {
	page := 1
	if p := strings.TrimSpace(c.Query("page")); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 10
	if ps := strings.TrimSpace(c.Query("page_size")); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 {
			pageSize = parsed
		}
	}

	var searchQuery *string
	if q := strings.TrimSpace(c.Query("search_query")); q != "" {
		searchQuery = &q
	}

	var templateTypeCode *string
	if t := strings.TrimSpace(c.Query("template_type_code")); t != "" {
		upper := strings.ToUpper(t)
		templateTypeCode = &upper
	}

	var templateCategoryCode *string
	if tc := strings.TrimSpace(c.Query("template_category_code")); tc != "" {
		upper := strings.ToUpper(tc)
		templateCategoryCode = &upper
	}

	params := dto.DocumentTemplateListQuery{
		Page:                 page,
		PageSize:             pageSize,
		SearchQuery:          searchQuery,
		TemplateTypeCode:     templateTypeCode,
		TemplateCategoryCode: templateCategoryCode,
	}

	ctx := context.Background()
	resp, err := h.service.ListTemplates(ctx, params)
	if err != nil {
		return nil, "error", err
	}

	return resp, "ok", nil
}

// PATCH /template/:id
func (h *DocumentTemplateHandler) UpdateTemplate(c fiber.Ctx) (interface{}, string, error) {
	templateIDStr := strings.TrimSpace(c.Params("id"))
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid template id")
	}

	var in dto.DocumentTemplateUpdateRequest
	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	if in.Code != nil {
		trimmed := strings.TrimSpace(*in.Code)
		in.Code = &trimmed
	}
	if in.Name != nil {
		trimmed := strings.TrimSpace(*in.Name)
		in.Name = &trimmed
	}

	ctx := context.Background()
	if err := h.service.UpdateTemplate(ctx, templateID, in); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document template updated successfully",
	}, "ok", nil
}

// PATCH /template/:id/disable
func (h *DocumentTemplateHandler) DisableTemplate(c fiber.Ctx) (interface{}, string, error) {
	templateIDStr := strings.TrimSpace(c.Params("id"))
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid template id")
	}

	ctx := context.Background()
	if err := h.service.DisableTemplate(ctx, templateID); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document template disabled successfully",
	}, "ok", nil
}

// PATCH /template/:id/enable
func (h *DocumentTemplateHandler) EnableTemplate(c fiber.Ctx) (interface{}, string, error) {
	templateIDStr := strings.TrimSpace(c.Params("id"))
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid template id")
	}

	ctx := context.Background()
	if err := h.service.EnableTemplate(ctx, templateID); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document template enabled successfully",
	}, "ok", nil
}
