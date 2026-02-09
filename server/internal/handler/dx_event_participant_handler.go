package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type EventParticipantHandler struct {
	service *service.EventParticipantService
}

func NewEventParticipantHandler(service *service.EventParticipantService) *EventParticipantHandler {
	return &EventParticipantHandler{service: service}
}

func (h *EventParticipantHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid participant ID format")
	}

	participant, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event participant")
	}
	if participant == nil {
		return NotFoundResponse(c, "Event participant not found")
	}

	return SuccessResponse(c, "Event participant retrieved", participant)
}

func (h *EventParticipantHandler) GetByEventID(c fiber.Ctx) error {
	ctx := c.Context()

	eventIDParam := c.Params("eventId")
	eventID, err := uuid.Parse(eventIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	participants, total, err := h.service.GetByEventID(ctx, eventID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event participants")
	}

	return SuccessWithMeta(c, participants, &Meta{
		Total: total,
	})
}

func (h *EventParticipantHandler) GetByUserDetailID(c fiber.Ctx) error {
	ctx := c.Context()

	userDetailIDParam := c.Params("userDetailId")
	userDetailID, err := uuid.Parse(userDetailIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user detail ID format")
	}

	participants, err := h.service.GetByUserDetailID(ctx, userDetailID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event participants")
	}

	return SuccessResponse(c, "Event participants retrieved", participants)
}

func (h *EventParticipantHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.EventParticipant
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	participant, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create event participant")
	}

	return CreatedResponse(c, "Event participant created", participant)
}

func (h *EventParticipantHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid participant ID format")
	}

	var input models.EventParticipant
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	input.ID = id
	participant, err := h.service.Update(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to update event participant")
	}

	return SuccessResponse(c, "Event participant updated", participant)
}

func (h *EventParticipantHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid participant ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete event participant")
	}

	return NoContentResponse(c)
}

func (h *EventParticipantHandler) CountByEventID(c fiber.Ctx) error {
	ctx := c.Context()

	eventIDParam := c.Params("eventId")
	eventID, err := uuid.Parse(eventIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	count, err := h.service.CountByEventID(ctx, eventID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to count event participants")
	}

	return SuccessResponse(c, "Event participants count retrieved", fiber.Map{
		"event_id": eventID,
		"count":    count,
	})
}