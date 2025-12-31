package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type UserHandler struct {
	service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) GetAll(c *fiber.Ctx) error {
	ctx := c.UserContext()

	limit := c.QueryInt("limit", 10)
	offset := c.QueryInt("offset", 0)

	users, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch users")
	}

	return SuccessWithMeta(c, users, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *UserHandler) GetByID(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	user, err := h.service.GetByID(ctx, id)
	if err != nil {
		return NotFoundResponse(c, "User not found")
	}

	return SuccessResponse(c, "User retrieved successfully", user)
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
	ctx := c.UserContext()

	var input models.User
	if err := c.BodyParser(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	user, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create user")
	}

	return CreatedResponse(c, "User created successfully", user)
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	var input models.User
	if err := c.BodyParser(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	user, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update user")
	}

	return SuccessResponse(c, "User updated successfully", user)
}

func (h *UserHandler) Delete(c *fiber.Ctx) error {
	ctx := c.UserContext()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete user")
	}

	return NoContentResponse(c)
}
