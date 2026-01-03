package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/dto"
	"server/internal/service"
)

type FNEventHandler struct {
	service service.FNEventService
}

// NewFNEventHandler creates a new FN event handler
func NewFNEventHandler(svc service.FNEventService) *FNEventHandler {
	return &FNEventHandler{service: svc}
}

// Create creates a new event with schedules and participants
// POST /api/v1/fn/events
func (h *FNEventHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	userID, err := getUserIDFromContext(c)
	if err != nil {
		return UnauthorizedResponse(c, "User not authenticated")
	}

	var req dto.EventCreateRequest
	if err := c.Bind().Body(&req); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	if req.Code == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Code is required")
	}
	if req.Title == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Title is required")
	}
	if req.Location == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Location is required")
	}

	result, err := h.service.Create(ctx, userID, req)
	if err != nil {
		return handleServiceError(c, err)
	}

	return CreatedResponse(c, "Event created successfully", result)
}

// GetByID retrieves an event by ID with all nested data
// GET /api/v1/fn/events/:id
func (h *FNEventHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	result, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event")
	}
	if result == nil {
		return NotFoundResponse(c, "Event not found")
	}

	return SuccessResponse(c, "Event retrieved successfully", result)
}

// GetByCode retrieves an event by code with all nested data
// GET /api/v1/fn/events/code/:code
func (h *FNEventHandler) GetByCode(c fiber.Ctx) error {
	ctx := c.Context()

	code := c.Params("code")
	if code == "" {
		return BadRequestResponse(c, "INVALID_CODE", "Event code is required")
	}

	result, err := h.service.GetByCode(ctx, code)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch event")
	}
	if result == nil {
		return NotFoundResponse(c, "Event not found")
	}

	return SuccessResponse(c, "Event retrieved successfully", result)
}

// List retrieves events with filters and pagination
// GET /api/v1/fn/events?page=1&page_size=10&q=search&is_public=true&status=SCHEDULED&template_id=uuid
func (h *FNEventHandler) List(c fiber.Ctx) error {
	ctx := c.Context()

	params := dto.EventListQuery{
		Page:     fiber.Query(c, "page", 1),
		PageSize: fiber.Query(c, "page_size", 10),
	}

	searchQuery := ""
	if q := c.Query("q"); q != "" {
		searchQuery = q
		params.SearchQuery = &q
	}

	if isPublicStr := c.Query("is_public"); isPublicStr != "" {
		isPublic := isPublicStr == "true"
		params.IsPublic = &isPublic
	}

	if status := c.Query("status"); status != "" {
		params.Status = &status
	}

	if templateID := c.Query("template_id"); templateID != "" {
		params.TemplateID = &templateID
	}

	items, total, err := h.service.List(ctx, params)
	if err != nil {
		return InternalErrorResponse(c, "Failed to list events")
	}

	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	others := []MetaFNFilter{}

	if params.IsPublic != nil {
		others = append(others, MetaFNFilter{Key: "is_public", Value: *params.IsPublic})
	}
	if params.Status != nil && *params.Status != "" {
		others = append(others, MetaFNFilter{Key: "status", Value: *params.Status})
	}
	if params.TemplateID != nil && *params.TemplateID != "" {
		others = append(others, MetaFNFilter{Key: "template_id", Value: *params.TemplateID})
	}

	meta := &MetaFN{
		Total:       total,
		Page:        params.Page,
		PageSize:    params.PageSize,
		HasPrevPage: params.Page > 1,
		HasNextPage: params.Page < totalPages,
		SearchQuery: searchQuery,
		Others:      others,
	}

	return SuccessWithMetaFN(c, items, meta)
}

// Update updates an event
// PUT /api/v1/fn/events/:id
func (h *FNEventHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	var req dto.EventUpdateRequest
	if err := c.Bind().Body(&req); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	result, err := h.service.Update(ctx, id, req)
	if err != nil {
		return handleServiceError(c, err)
	}

	return SuccessResponse(c, "Event updated successfully", result)
}

// Delete deletes an event
// DELETE /api/v1/fn/events/:id
func (h *FNEventHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid event ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return handleServiceError(c, err)
	}

	return NoContentResponse(c)
}