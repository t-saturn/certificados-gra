package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

// TemplateHandler gestiona las solicitudes para plantillas de documentos
type TemplateHandler struct {
	service services.TemplateService
}

func NewTemplateHandler(service services.TemplateService) *TemplateHandler {
	return &TemplateHandler{service: service}
}

func (h *TemplateHandler) UpdateTemplate(c fiber.Ctx) (interface{}, string, error) {
	// Path param: template ID
	templateIDStr := c.Params("id")
	if templateIDStr == "" {
		return nil, "bad_request", fmt.Errorf("template id is required in path")
	}
	templateID, err := uuid.Parse(templateIDStr)
	if err != nil {
		return nil, "bad_request", fmt.Errorf("invalid template id: %w", err)
	}

	// Query param: user_id (quién actualiza, para notificación)
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		return nil, "bad_request", fmt.Errorf("user_id query param is required")
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, "bad_request", fmt.Errorf("invalid user_id: %w", err)
	}

	var req dto.UpdateTemplateRequest
	if err = c.Bind().Body(&req); err != nil {
		return nil, "bad_request", fmt.Errorf("invalid JSON body: %w", err)
	}

	ctx := context.Background()
	template, err := h.service.UpdateTemplate(ctx, templateID, userID, req)
	if err != nil {
		return nil, "error", err
	}

	resp := dto.TemplateUpdatedResponse{
		ID:      template.ID,
		Name:    template.Name,
		Message: "Plantilla actualizada con éxito",
	}

	return resp, "ok", nil
}

// GET /templates?search_query=&page=&page_size=&type=
func (h *TemplateHandler) ListTemplates(c fiber.Ctx) (interface{}, string, error) {
	// page
	pageStr := c.Query("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	// page_size
	pageSizeStr := c.Query("page_size", "10")
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}

	// search_query
	var searchQueryPtr *string
	if q := strings.TrimSpace(c.Query("search_query")); q != "" {
		searchQueryPtr = &q
	}

	// type (código, ej: CERTIFICATE, CONSTANCY)
	var typePtr *string
	if t := strings.TrimSpace(c.Query("type")); t != "" {
		upper := strings.ToUpper(t)
		typePtr = &upper
	}

	params := dto.TemplateListQuery{
		Page:        page,
		PageSize:    pageSize,
		SearchQuery: searchQueryPtr,
		Type:        typePtr,
	}

	ctx := context.Background()
	resp, err := h.service.ListTemplates(ctx, params)
	if err != nil {
		return nil, "error", err
	}

	return resp, "ok", nil
}

// POST /template?user_id=<uuid>
func (h *TemplateHandler) CreateTemplate(c fiber.Ctx) (interface{}, string, error) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		return nil, "bad_request", fmt.Errorf("user_id query param is required")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, "bad_request", fmt.Errorf("invalid user_id: %w", err)
	}

	var req dto.CreateTemplateRequest
	if err = c.Bind().Body(&req); err != nil {
		return nil, "bad_request", fmt.Errorf("invalid JSON body: %w", err)
	}

	ctx := context.Background()
	template, err := h.service.CreateTemplate(ctx, userID, req)
	if err != nil {
		return nil, "error", err
	}

	resp := dto.TemplateCreatedResponse{
		ID:      template.ID,
		Name:    template.Name,
		Message: "Plantilla creada con éxito",
	}

	return resp, "ok", nil
}
