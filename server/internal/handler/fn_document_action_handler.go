package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/dto"
	"server/internal/service"
)

type FNDocumentActionHandler struct {
	service service.FNDocumentActionService
}

// NewFNDocumentActionHandler creates a new FN document action handler
func NewFNDocumentActionHandler(svc service.FNDocumentActionService) *FNDocumentActionHandler {
	return &FNDocumentActionHandler{service: svc}
}

// ExecuteAction executes a document action
// POST /api/v1/fn/documents/actions
func (h *FNDocumentActionHandler) ExecuteAction(c fiber.Ctx) error {
	ctx := c.Context()

	userID, err := getUserIDFromContext(c)
	if err != nil {
		return UnauthorizedResponse(c, "User not authenticated")
	}

	var req dto.DocumentActionRequest
	if err := c.Bind().Body(&req); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	if req.Action == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Action is required")
	}
	if req.EventID == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Event ID is required")
	}
	if len(req.Participants) == 0 {
		return BadRequestResponse(c, "VALIDATION_ERROR", "At least one participant is required")
	}

	result, err := h.service.ExecuteAction(ctx, userID, req)
	if err != nil {
		return handleServiceError(c, err)
	}

	return SuccessResponse(c, "Action executed successfully", result)
}

// GetByID retrieves a document by ID with all details
// GET /api/v1/fn/documents/:id
func (h *FNDocumentActionHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid document ID format")
	}

	result, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document")
	}
	if result == nil {
		return NotFoundResponse(c, "Document not found")
	}

	return SuccessResponse(c, "Document retrieved successfully", result)
}

// GetBySerialCode retrieves a document by serial code
// GET /api/v1/fn/documents/serial/:serial_code
func (h *FNDocumentActionHandler) GetBySerialCode(c fiber.Ctx) error {
	ctx := c.Context()

	serialCode := c.Params("serial_code")
	if serialCode == "" {
		return BadRequestResponse(c, "INVALID_CODE", "Serial code is required")
	}

	result, err := h.service.GetBySerialCode(ctx, serialCode)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch document")
	}
	if result == nil {
		return NotFoundResponse(c, "Document not found")
	}

	return SuccessResponse(c, "Document retrieved successfully", result)
}

// List retrieves documents with filters and pagination
// GET /api/v1/fn/documents?page=1&page_size=10&q=search&event_id=uuid&template_id=uuid&status=CREATED
func (h *FNDocumentActionHandler) List(c fiber.Ctx) error {
	ctx := c.Context()

	params := dto.DocumentListQuery{
		Page:     fiber.Query(c, "page", 1),
		PageSize: fiber.Query(c, "page_size", 10),
	}

	searchQuery := ""
	if q := c.Query("q"); q != "" {
		searchQuery = q
		params.SearchQuery = &q
	}

	if eventID := c.Query("event_id"); eventID != "" {
		params.EventID = &eventID
	}

	if templateID := c.Query("template_id"); templateID != "" {
		params.TemplateID = &templateID
	}

	if status := c.Query("status"); status != "" {
		params.Status = &status
	}

	items, total, err := h.service.List(ctx, params)
	if err != nil {
		return InternalErrorResponse(c, "Failed to list documents")
	}

	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	others := []MetaFNFilter{}

	if params.EventID != nil && *params.EventID != "" {
		others = append(others, MetaFNFilter{Key: "event_id", Value: *params.EventID})
	}
	if params.TemplateID != nil && *params.TemplateID != "" {
		others = append(others, MetaFNFilter{Key: "template_id", Value: *params.TemplateID})
	}
	if params.Status != nil && *params.Status != "" {
		others = append(others, MetaFNFilter{Key: "status", Value: *params.Status})
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