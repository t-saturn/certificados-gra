package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type StudyMaterialHandler struct {
	service *service.StudyMaterialService
}

func NewStudyMaterialHandler(service *service.StudyMaterialService) *StudyMaterialHandler {
	return &StudyMaterialHandler{service: service}
}

func (h *StudyMaterialHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	materials, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch study materials")
	}

	return SuccessWithMeta(c, materials, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *StudyMaterialHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid study material ID format")
	}

	material, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch study material")
	}
	if material == nil {
		return NotFoundResponse(c, "Study material not found")
	}

	return SuccessResponse(c, "Study material retrieved", material)
}

func (h *StudyMaterialHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.StudyMaterial
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	material, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create study material")
	}

	return CreatedResponse(c, "Study material created", material)
}

func (h *StudyMaterialHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid study material ID format")
	}

	var input models.StudyMaterial
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	material, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update study material")
	}

	return SuccessResponse(c, "Study material updated", material)
}

func (h *StudyMaterialHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid study material ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete study material")
	}

	return NoContentResponse(c)
}
