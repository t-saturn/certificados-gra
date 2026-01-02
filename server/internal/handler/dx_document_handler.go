package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type DocumentHandler struct {
	service *service.DocumentService
}

func NewDocumentHandler(service *service.DocumentService) *DocumentHandler {
	return &DocumentHandler{service: service}
}

func (h *DocumentHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	docs, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch documents")
	}

	return SuccessWithMeta(c, docs, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *DocumentHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document ID format")
	}

	doc, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document")
	}
	if doc == nil {
		return NotFoundResponse(c, "Document not found")
	}

	return SuccessResponse(c, "Document retrieved", doc)
}

func (h *DocumentHandler) GetBySerialCode(c fiber.Ctx) error {
	ctx := c.Context()

	serialCode := c.Params("serialCode")
	if serialCode == "" {
		return BadRequestResponse(c, "MISSING_SERIAL_CODE", "Serial code is required")
	}

	doc, err := h.service.GetBySerialCode(ctx, serialCode)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document")
	}
	if doc == nil {
		return NotFoundResponse(c, "Document not found")
	}

	return SuccessResponse(c, "Document retrieved", doc)
}

func (h *DocumentHandler) GetByVerificationCode(c fiber.Ctx) error {
	ctx := c.Context()

	verificationCode := c.Params("verificationCode")
	if verificationCode == "" {
		return BadRequestResponse(c, "MISSING_VERIFICATION_CODE", "Verification code is required")
	}

	doc, err := h.service.GetByVerificationCode(ctx, verificationCode)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document")
	}
	if doc == nil {
		return NotFoundResponse(c, "Document not found")
	}

	return SuccessResponse(c, "Document retrieved", doc)
}

func (h *DocumentHandler) GetByEventID(c fiber.Ctx) error {
	ctx := c.Context()

	eventIDParam := c.Params("eventId")
	eventID, err := uuid.Parse(eventIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	docs, err := h.service.GetByEventID(ctx, eventID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch documents")
	}

	return SuccessResponse(c, "Documents retrieved", docs)
}

func (h *DocumentHandler) GetByUserDetailID(c fiber.Ctx) error {
	ctx := c.Context()

	userDetailIDParam := c.Params("userDetailId")
	userDetailID, err := uuid.Parse(userDetailIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user detail ID format")
	}

	docs, err := h.service.GetByUserDetailID(ctx, userDetailID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch documents")
	}

	return SuccessResponse(c, "Documents retrieved", docs)
}

func (h *DocumentHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.Document
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	doc, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create document")
	}

	return CreatedResponse(c, "Document created", doc)
}

func (h *DocumentHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document ID format")
	}

	var input models.Document
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	doc, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update document")
	}

	return SuccessResponse(c, "Document updated", doc)
}

func (h *DocumentHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete document")
	}

	return NoContentResponse(c)
}