package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type UserDetailHandler struct {
	service *service.UserDetailService
}

func NewUserDetailHandler(service *service.UserDetailService) *UserDetailHandler {
	return &UserDetailHandler{service: service}
}

func (h *UserDetailHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	details, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch user details")
	}

	return SuccessWithMeta(c, details, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *UserDetailHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user detail ID format")
	}

	detail, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch user detail")
	}
	if detail == nil {
		return NotFoundResponse(c, "User detail not found")
	}

	return SuccessResponse(c, "User detail retrieved", detail)
}

func (h *UserDetailHandler) GetByNationalID(c fiber.Ctx) error {
	ctx := c.Context()

	nationalID := c.Params("nationalId")
	if nationalID == "" {
		return BadRequestResponse(c, "MISSING_NATIONAL_ID", "National ID is required")
	}

	detail, err := h.service.GetByNationalID(ctx, nationalID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch user detail")
	}
	if detail == nil {
		return NotFoundResponse(c, "User detail not found")
	}

	return SuccessResponse(c, "User detail retrieved", detail)
}

func (h *UserDetailHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.UserDetail
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	detail, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create user detail")
	}

	return CreatedResponse(c, "User detail created", detail)
}

func (h *UserDetailHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user detail ID format")
	}

	var input models.UserDetail
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	detail, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update user detail")
	}

	return SuccessResponse(c, "User detail updated", detail)
}

func (h *UserDetailHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user detail ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete user detail")
	}

	return NoContentResponse(c)
}