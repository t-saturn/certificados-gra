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

type DocumentTypeHandler struct {
	service services.DocumentTypeService
}

func NewDocumentTypeHandler(service services.DocumentTypeService) *DocumentTypeHandler {
	return &DocumentTypeHandler{
		service: service,
	}
}

// POST /document-type
func (h *DocumentTypeHandler) CreateType(c fiber.Ctx) (interface{}, string, error) {
	var in dto.DocumentTypeCreateRequest

	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	in.Code = strings.TrimSpace(in.Code)
	in.Name = strings.TrimSpace(in.Name)

	if in.Code == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "code is required")
	}
	if in.Name == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "name is required")
	}

	ctx := context.Background()
	if err := h.service.CreateType(ctx, in); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document type created successfully",
	}, "ok", nil
}

// GET /document-types?search_query=&page=&page_size=&is_active=
func (h *DocumentTypeHandler) ListTypes(c fiber.Ctx) (interface{}, string, error) {
	var params dto.DocumentTypeListQuery

	// page
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	params.Page = page

	// page_size
	pageSizeStr := c.Query("page_size", "10")
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}
	params.PageSize = pageSize

	// search_query
	if q := strings.TrimSpace(c.Query("search_query")); q != "" {
		params.SearchQuery = &q
	}

	// is_active
	if iaStr := strings.TrimSpace(c.Query("is_active")); iaStr != "" {
		if ia, err := strconv.ParseBool(iaStr); err == nil {
			params.IsActive = &ia
		}
	}

	ctx := context.Background()
	resp, err := h.service.ListTypes(ctx, params)
	if err != nil {
		return nil, "error", err
	}

	return resp, "ok", nil
}

// PATCH /document-type/:id
func (h *DocumentTypeHandler) UpdateType(c fiber.Ctx) (interface{}, string, error) {
	idStr := c.Params("id")
	if idStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}

	var in dto.DocumentTypeUpdateRequest
	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	if in.Code != nil {
		code := strings.TrimSpace(*in.Code)
		in.Code = &code
	}
	if in.Name != nil {
		name := strings.TrimSpace(*in.Name)
		in.Name = &name
	}

	ctx := context.Background()
	if err := h.service.UpdateType(ctx, id, in); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document type updated successfully",
	}, "ok", nil
}

// PATCH /document-type/:id/disable
func (h *DocumentTypeHandler) DisableType(c fiber.Ctx) (interface{}, string, error) {
	idStr := c.Params("id")
	if idStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}

	ctx := context.Background()
	if err := h.service.DisableType(ctx, id); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document type disabled successfully",
	}, "ok", nil
}

// PATCH /document-type/:id/enable
func (h *DocumentTypeHandler) EnableType(c fiber.Ctx) (interface{}, string, error) {
	idStr := c.Params("id")
	if idStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "id is required")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid id")
	}

	ctx := context.Background()
	if err := h.service.EnableType(ctx, id); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Document type enabled successfully",
	}, "ok", nil
}
