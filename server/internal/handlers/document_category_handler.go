package handlers

import (
	"context"
	"strconv"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
)

type DocumentCategoryHandler struct {
	service services.DocumentCategoryService
}

func NewDocumentCategoryHandler(service services.DocumentCategoryService) *DocumentCategoryHandler {
	return &DocumentCategoryHandler{
		service: service,
	}
}

// POST /document-category
func (h *DocumentCategoryHandler) CreateCategory(c fiber.Ctx) (interface{}, string, error) {
	var in dto.DocumentCategoryCreateRequest

	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	// Validaciones mínimas (puedes mover a validator si quieres)
	in.Code = strings.TrimSpace(in.Code)
	in.Name = strings.TrimSpace(in.Name)

	if in.Code == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "code is required")
	}
	if in.Name == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "name is required")
	}

	ctx := context.Background()
	if err := h.service.CreateCategory(ctx, in); err != nil {
		return nil, "error", err
	}

	// Solo mensaje, como pediste
	return fiber.Map{
		"message": "Document category created successfully",
	}, "ok", nil
}

// GET /document-categories?search_query=&page=&page_size=&is_active=
func (h *DocumentCategoryHandler) ListCategories(c fiber.Ctx) (interface{}, string, error) {
	var params dto.DocumentCategoryListQuery

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
	resp, err := h.service.ListCategories(ctx, params)
	if err != nil {
		return nil, "error", err
	}

	return resp, "ok", nil
}
