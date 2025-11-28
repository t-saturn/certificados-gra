package handlers

import (
	"context"
	"fmt"

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
