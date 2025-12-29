package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type DocumentTypeHandler struct {
	service *service.DocumentTypeService
}

func NewDocumentTypeHandler(service *service.DocumentTypeService) *DocumentTypeHandler {
	return &DocumentTypeHandler{service: service}
}

func (h *DocumentTypeHandler) GetAll(c *fiber.Ctx) error {
	ctx := c.UserContext()

	limit := c.QueryInt("limit", 10)
	offset := c.QueryInt("offset", 0)

	docTypes, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document types")
	}

	return SuccessWithMeta(c, docTypes, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *DocumentTypeHandler) GetActive(c *fiber.Ctx) error {
	ctx := c.UserContext()

	docTypes, err := h.service.GetActive(ctx)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch active document types")
	}

	return SuccessResponse(c, "Active document types retrieved", docTypes)
}

func (h *DocumentTypeHandler) GetByID(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document type ID format")
	}

	docType, err := h.service.GetByID(ctx, id)
	if err != nil {
		return NotFoundResponse(c, "Document type not found")
	}

	return SuccessResponse(c, "Document type retrieved", docType)
}

func (h *DocumentTypeHandler) GetByCode(c *fiber.Ctx) error {
	ctx := c.UserContext()

	code := c.Params("code")
	if code == "" {
		return BadRequestResponse(c, "MISSING_CODE", "Code is required")
	}

	docType, err := h.service.GetByCode(ctx, code)
	if err != nil {
		return NotFoundResponse(c, "Document type not found")
	}

	return SuccessResponse(c, "Document type retrieved", docType)
}

func (h *DocumentTypeHandler) Create(c *fiber.Ctx) error {
	ctx := c.UserContext()

	var input models.DocumentType
	if err := c.BodyParser(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	docType, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create document type")
	}

	return CreatedResponse(c, "Document type created", docType)
}

func (h *DocumentTypeHandler) Update(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document type ID format")
	}

	var input models.DocumentType
	if err := c.BodyParser(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	docType, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update document type")
	}

	return SuccessResponse(c, "Document type updated", docType)
}

func (h *DocumentTypeHandler) Delete(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document type ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete document type")
	}

	return NoContentResponse(c)
}
