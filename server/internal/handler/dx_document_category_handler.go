package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type DocumentCategoryHandler struct {
	service *service.DocumentCategoryService
}

func NewDocumentCategoryHandler(service *service.DocumentCategoryService) *DocumentCategoryHandler {
	return &DocumentCategoryHandler{service: service}
}

func (h *DocumentCategoryHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	categories, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document categories")
	}

	return SuccessWithMeta(c, categories, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *DocumentCategoryHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return BadRequestResponse(c, "INVALID_ID", "Invalid category ID format")
	}

	category, err := h.service.GetByID(ctx, uint(id))
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document category")
	}
	if category == nil {
		return NotFoundResponse(c, "Document category not found")
	}

	return SuccessResponse(c, "Document category retrieved", category)
}

func (h *DocumentCategoryHandler) GetByDocumentTypeID(c fiber.Ctx) error {
	ctx := c.Context()

	docTypeIDParam := c.Params("documentTypeId")
	docTypeID, err := uuid.Parse(docTypeIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document type ID format")
	}

	categories, err := h.service.GetByDocumentTypeID(ctx, docTypeID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document categories")
	}

	return SuccessResponse(c, "Document categories retrieved", categories)
}

func (h *DocumentCategoryHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.DocumentCategory
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	category, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create document category")
	}

	return CreatedResponse(c, "Document category created", category)
}

func (h *DocumentCategoryHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return BadRequestResponse(c, "INVALID_ID", "Invalid category ID format")
	}

	var input models.DocumentCategory
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = uint(id)
	category, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update document category")
	}

	return SuccessResponse(c, "Document category updated", category)
}

func (h *DocumentCategoryHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return BadRequestResponse(c, "INVALID_ID", "Invalid category ID format")
	}

	if err := h.service.Delete(ctx, uint(id)); err != nil {
		return InternalErrorResponse(c, "Failed to delete document category")
	}

	return NoContentResponse(c)
}