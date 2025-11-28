package handlers

import (
	"context"
	"fmt"
	"strconv"
	"strings"

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

// GET /events?search_query=...&status=...&page=...&page_size=...
func (h *EventHandler) ListEvents(c fiber.Ctx) (interface{}, string, error) {
	searchQuery := c.Query("search_query", "")
	status := c.Query("status", "") // scheduled, in_progress, completed, all, "" (todos)

	pageStr := c.Query("page", "1")
	pageSizeStr := c.Query("page_size", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}
	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize <= 0 {
		pageSize = 10
	}

	in := dto.ListEventsQuery{
		SearchQuery: strings.TrimSpace(searchQuery),
		Status:      strings.TrimSpace(status),
		Page:        page,
		PageSize:    pageSize,
	}

	result, err := h.svc.ListEvents(context.Background(), in)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"events":  result.Events,
		"filters": result.Filters,
	}

	return data, "ok", nil
}

func (h *EventHandler) UpdateEvent(c fiber.Ctx) (interface{}, string, error) {
	var req dto.UpdateEventRequest

	if err := c.Bind().Body(&req); err != nil {
		return nil, "", fmt.Errorf("invalid request body")
	}

	// ID del evento por path param /events/:id
	eventIDParam := c.Params("id")
	if eventIDParam == "" {
		return nil, "", fmt.Errorf("missing event id param")
	}

	eventID, err := uuid.Parse(eventIDParam)
	if err != nil {
		return nil, "", fmt.Errorf("invalid event id")
	}

	updatedID, updatedTitle, err := h.svc.UpdateEvent(context.Background(), eventID, req)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"id":      updatedID,
		"name":    updatedTitle,
		"message": fmt.Sprintf("Evento actualizado con éxito: %s", updatedTitle),
	}

	return data, "ok", nil
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
