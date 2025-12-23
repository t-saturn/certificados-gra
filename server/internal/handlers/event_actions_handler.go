package handlers

import (
	"context"
	"fmt"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type EventActionHandler struct {
	svc services.EventActionService
}

func NewEventActionHandler(svc services.EventActionService) *EventActionHandler {
	return &EventActionHandler{svc: svc}
}

// POST /event/:id
func (h *EventActionHandler) RunEventAction(c fiber.Ctx) (interface{}, string, error) {
	idParam := strings.TrimSpace(c.Params("id", ""))
	evID, err := uuid.Parse(idParam)
	if err != nil {
		return nil, "", fmt.Errorf("invalid event id")
	}

	var req dto.EventActionRequest
	if err := c.Bind().Body(&req); err != nil {
		return nil, "", fmt.Errorf("invalid body")
	}

	hasQrRect := req.QrRect != nil && strings.TrimSpace(*req.QrRect) != ""
	// log rápido (si ya tienes middleware logger, puedes quitarlo)
	fmt.Printf("[event_action] incoming event_id=%s action=%s participants=%d has_qr_rect=%v\n",
		evID.String(), req.Action, len(req.ParticipantsID), hasQrRect)

	jobID, created, skipped, updated, err := h.svc.RunEventAction(
		context.Background(),
		evID,
		req.Action,
		req.ParticipantsID,
		req.QrRect, // <- NUEVO
	)
	if err != nil {
		return nil, "", err
	}

	data := fiber.Map{
		"event_id": evID.String(),
		"action":   req.Action,
		"result": fiber.Map{
			"created": created,
			"skipped": skipped,
			"updated": updated,
		},
	}

	if jobID != nil {
		data["job_id"] = *jobID
	}

	return data, "ok", nil
}
