package handlers

import (
	"context"
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
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "user_id is required")
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
