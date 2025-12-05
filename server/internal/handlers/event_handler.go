package handlers

import (
	"context"
	"strconv"
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

// GET /events
func (h *EventHandler) ListEvents(c fiber.Ctx) (interface{}, string, error) {
	// page
	page := 1
	if p := strings.TrimSpace(c.Query("page")); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	// page_size
	pageSize := 10
	if ps := strings.TrimSpace(c.Query("page_size")); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 {
			pageSize = parsed
		}
	}

	var searchQuery *string
	if q := strings.TrimSpace(c.Query("search_query")); q != "" {
		searchQuery = &q
	}

	var status *string
	if sStr := strings.TrimSpace(c.Query("status")); sStr != "" {
		status = &sStr
	}

	var templateID *string
	if t := strings.TrimSpace(c.Query("template_id")); t != "" {
		templateID = &t
	}

	var docTypeCode *string
	if dtc := strings.TrimSpace(c.Query("document_type_code")); dtc != "" {
		upper := strings.ToUpper(dtc)
		docTypeCode = &upper
	}

	// is_template_active: si no se envía, por defecto true
	var isTemplateActive *bool
	if iaStr := strings.TrimSpace(c.Query("is_template_active")); iaStr != "" {
		if ia, err := strconv.ParseBool(iaStr); err == nil {
			isTemplateActive = &ia
		}
	} else {
		v := true
		isTemplateActive = &v
	}

	// is_public (sin default, solo filtra si viene)
	var isPublic *bool
	if ipStr := strings.TrimSpace(c.Query("is_public")); ipStr != "" {
		if v, err := strconv.ParseBool(ipStr); err == nil {
			isPublic = &v
		}
	}

	// user_id (uuid string, lo parseamos en service)
	var userID *string
	if u := strings.TrimSpace(c.Query("user_id")); u != "" {
		userID = &u
	}

	var dateFrom *string
	if df := strings.TrimSpace(c.Query("date_from")); df != "" {
		dateFrom = &df
	}
	var dateTo *string
	if dt := strings.TrimSpace(c.Query("date_to")); dt != "" {
		dateTo = &dt
	}

	params := dto.EventListQuery{
		Page:               page,
		PageSize:           pageSize,
		SearchQuery:        searchQuery,
		Status:             status,
		TemplateID:         templateID,
		DocumentTypeCode:   docTypeCode,
		IsTemplateActive:   isTemplateActive,
		IsPublic:           isPublic, // nuevo
		UserID:             userID,   // nuevo
		CreatedDateFromStr: dateFrom,
		CreatedDateToStr:   dateTo,
	}

	ctx := context.Background()
	resp, err := h.service.ListEvents(ctx, params)
	if err != nil {
		return nil, "error", err
	}

	return resp, "ok", nil
}

// GET /event/:id
func (h *EventHandler) GetEvent(c fiber.Ctx) (interface{}, string, error) {
	idStr := strings.TrimSpace(c.Params("id"))
	if idStr == "" {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid event id")
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, "error", fiber.NewError(fiber.StatusBadRequest, "invalid event id")
	}

	ctx := context.Background()
	detail, err := h.service.GetEventByID(ctx, id)
	if err != nil {
		// Podrías mejorar esto detectando "event not found" y devolver 404,
		// pero para ser consistente con otros handlers, lo dejamos así.
		return nil, "error", err
	}

	return detail, "ok", nil
}
