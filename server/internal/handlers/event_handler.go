package handlers

import (
	"context"
	"fmt"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type EventHandler struct {
	svc services.EventService
}

func NewEventHandler(svc services.EventService) *EventHandler {
	return &EventHandler{svc: svc}
}

// Compatible con httpwrap.HandlerFunc:
// type HandlerFunc func(c fiber.Ctx) (data interface{}, message string, err error)
func (h *EventHandler) CreateEvent(c fiber.Ctx) (interface{}, string, error) {
	var req dto.CreateEventRequest

	// Fiber v3
	if err := c.Bind().Body(&req); err != nil {
		return nil, "", fmt.Errorf("invalid request body")
	}

	// user_id por query param ?user_id=
	userIDParam := c.Query("user_id")
	if userIDParam == "" {
		return nil, "", fmt.Errorf("missing user_id query param")
	}

	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return nil, "", fmt.Errorf("invalid user_id")
	}

	eventID, eventTitle, err := h.svc.CreateEvent(context.Background(), userID, req)
	if err != nil {
		return nil, "", err
	}

	// 🔹 data simple, como pides
	data := fiber.Map{
		"id":      eventID,
		"name":    eventTitle,
		"message": fmt.Sprintf("Evento registrado con éxito: %s", eventTitle),
	}

	// este "ok" se va como `message` en dto.Response
	return data, "ok", nil
}
