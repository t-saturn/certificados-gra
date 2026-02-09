package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type EventHandler struct {
	service *service.EventService
}

func NewEventHandler(service *service.EventService) *EventHandler {
	return &EventHandler{service: service}
}

func (h *EventHandler) GetAll(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	events, total, err := h.service.GetAll(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch events")
	}

	return SuccessWithMeta(c, events, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *EventHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	event, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event")
	}
	if event == nil {
		return NotFoundResponse(c, "Event not found")
	}

	return SuccessResponse(c, "Event retrieved", event)
}

func (h *EventHandler) GetByCode(c fiber.Ctx) error {
	ctx := c.Context()

	code := c.Params("code")
	if code == "" {
		return BadRequestResponse(c, "MISSING_CODE", "Code is required")
	}

	event, err := h.service.GetByCode(ctx, code)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event")
	}
	if event == nil {
		return NotFoundResponse(c, "Event not found")
	}

	return SuccessResponse(c, "Event retrieved", event)
}

func (h *EventHandler) GetByStatus(c fiber.Ctx) error {
	ctx := c.Context()

	status := c.Params("status")
	if status == "" {
		return BadRequestResponse(c, "MISSING_STATUS", "Status is required")
	}

	events, err := h.service.GetByStatus(ctx, status)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch events")
	}

	return SuccessResponse(c, "Events retrieved", events)
}

func (h *EventHandler) GetPublic(c fiber.Ctx) error {
	ctx := c.Context()

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	events, total, err := h.service.GetPublic(ctx, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch public events")
	}

	return SuccessWithMeta(c, events, &Meta{
		Limit: limit,
		Total: total,
	})
}

func (h *EventHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.Event
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	event, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create event")
	}

	return CreatedResponse(c, "Event created", event)
}

func (h *EventHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	var input models.Event
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	event, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update event")
	}

	return SuccessResponse(c, "Event updated", event)
}

func (h *EventHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete event")
	}

	return NoContentResponse(c)
}