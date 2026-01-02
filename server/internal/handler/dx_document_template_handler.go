package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type DocumentTemplateHandler struct {
	service *service.DocumentTemplateService
}

func NewDocumentTemplateHandler(service *service.DocumentTemplateService) *DocumentTemplateHandler {
	return &DocumentTemplateHandler{service: service}
}

func (h *DocumentTemplateHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	templates, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document templates")
	}

	return SuccessWithMeta(c, templates, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *DocumentTemplateHandler) GetActive(c fiber.Ctx) error {
	ctx := c.Context()

	templates, err := h.service.GetAllActive(ctx)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch active document templates")
	}

	return SuccessResponse(c, "Active document templates retrieved", templates)
}

func (h *DocumentTemplateHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document template ID format")
	}

	template, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document template")
	}
	if template == nil {
		return NotFoundResponse(c, "Document template not found")
	}

	return SuccessResponse(c, "Document template retrieved", template)
}

func (h *DocumentTemplateHandler) GetByDocumentTypeID(c fiber.Ctx) error {
	ctx := c.Context()

	docTypeIDParam := c.Params("documentTypeId")
	docTypeID, err := uuid.Parse(docTypeIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document type ID format")
	}

	templates, err := h.service.GetByDocumentTypeID(ctx, docTypeID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document templates")
	}

	return SuccessResponse(c, "Document templates retrieved", templates)
}

func (h *DocumentTemplateHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.DocumentTemplate
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	template, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create document template")
	}

	return CreatedResponse(c, "Document template created", template)
}

func (h *DocumentTemplateHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document template ID format")
	}

	var input models.DocumentTemplate
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	template, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update document template")
	}

	return SuccessResponse(c, "Document template updated", template)
}

func (h *DocumentTemplateHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document template ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete document template")
	}

	return NoContentResponse(c)
}