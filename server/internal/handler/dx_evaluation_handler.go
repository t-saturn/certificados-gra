package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type EvaluationHandler struct {
	service *service.EvaluationService
}

func NewEvaluationHandler(service *service.EvaluationService) *EvaluationHandler {
	return &EvaluationHandler{service: service}
}

func (h *EvaluationHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	evaluations, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch evaluations")
	}

	return SuccessWithMeta(c, evaluations, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *EvaluationHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid evaluation ID format")
	}

	evaluation, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch evaluation")
	}
	if evaluation == nil {
		return NotFoundResponse(c, "Evaluation not found")
	}

	return SuccessResponse(c, "Evaluation retrieved", evaluation)
}

func (h *EvaluationHandler) GetByUserID(c fiber.Ctx) error {
	ctx := c.Context()

	userIDParam := c.Params("userId")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	evaluations, err := h.service.GetByUserID(ctx, userID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch evaluations")
	}

	return SuccessResponse(c, "Evaluations retrieved", evaluations)
}

func (h *EvaluationHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.Evaluation
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	evaluation, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create evaluation")
	}

	return CreatedResponse(c, "Evaluation created", evaluation)
}

func (h *EvaluationHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid evaluation ID format")
	}

	var input models.Evaluation
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	evaluation, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update evaluation")
	}

	return SuccessResponse(c, "Evaluation updated", evaluation)
}

func (h *EvaluationHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid evaluation ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete evaluation")
	}

	return NoContentResponse(c)
}
