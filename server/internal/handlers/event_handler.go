package handlers

import (
	"context"
	"strings"

	"server/internal/dto"
	"server/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type EventHandler struct {
	service services.EventService
}

func NewEventHandler(service services.EventService) *EventHandler {
	return &EventHandler{service: service}
}

// POST /event?user_id=<uuid>
func (h *EventHandler) CreateEvent(c fiber.Ctx) (interface{}, string, error) {
	userIDStr := strings.TrimSpace(c.Query("user_id"))
	if userIDStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid user_id")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid user_id")
	}

	var in dto.EventCreateRequest
	if err := c.Bind().Body(&in); err != nil {
		return nil, "error", err
	}

	// Trim de campos básicos
	in.Code = strings.TrimSpace(in.Code)
	in.CertificateSeries = strings.TrimSpace(in.CertificateSeries)
	in.OrganizationalUnitsPath = strings.TrimSpace(in.OrganizationalUnitsPath)
	in.Title = strings.TrimSpace(in.Title)
	in.Location = strings.TrimSpace(in.Location)

	if in.TemplateID != nil {
		trimmed := strings.TrimSpace(*in.TemplateID)
		in.TemplateID = &trimmed
	}

	if in.Status != nil {
		trimmed := strings.TrimSpace(*in.Status)
		in.Status = &trimmed
	}

	// Trim en participantes (dni y demás)
	for i := range in.Participants {
		in.Participants[i].NationalID = strings.TrimSpace(in.Participants[i].NationalID)

		if in.Participants[i].FirstName != nil {
			trimmed := strings.TrimSpace(*in.Participants[i].FirstName)
			in.Participants[i].FirstName = &trimmed
		}
		if in.Participants[i].LastName != nil {
			trimmed := strings.TrimSpace(*in.Participants[i].LastName)
			in.Participants[i].LastName = &trimmed
		}
		if in.Participants[i].Phone != nil {
			trimmed := strings.TrimSpace(*in.Participants[i].Phone)
			in.Participants[i].Phone = &trimmed
		}
		if in.Participants[i].Email != nil {
			trimmed := strings.TrimSpace(*in.Participants[i].Email)
			in.Participants[i].Email = &trimmed
		}
		if in.Participants[i].RegistrationSource != nil {
			trimmed := strings.TrimSpace(*in.Participants[i].RegistrationSource)
			in.Participants[i].RegistrationSource = &trimmed
		}
	}

	// Validaciones mínimas como antes
	if in.Code == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "code is required")
	}
	if in.CertificateSeries == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "certificate_series is required")
	}
	if in.OrganizationalUnitsPath == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "organizational_units_path is required")
	}
	if in.Title == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "title is required")
	}
	if in.Location == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "location is required")
	}
	if len(in.Schedules) == 0 {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "at least one schedule is required")
	}

	ctx := context.Background()
	if err := h.service.CreateEvent(ctx, userID, in); err != nil {
		return nil, "error", err
	}

	return fiber.Map{
		"message": "Event created successfully",
	}, "ok", nil
}
