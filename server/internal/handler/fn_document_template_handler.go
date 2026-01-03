package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/dto"
	"server/internal/service"
)

// FNDocumentTemplateHandler handles document template endpoints with nested data
type FNDocumentTemplateHandler struct {
	service service.FNDocumentTemplateService
}

// NewFNDocumentTemplateHandler creates a new FN document template handler
func NewFNDocumentTemplateHandler(svc service.FNDocumentTemplateService) *FNDocumentTemplateHandler {
	return &FNDocumentTemplateHandler{service: svc}
}

// Create creates a new document template
// POST /api/v1/fn/document-templates
func (h *FNDocumentTemplateHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	// Get user ID from context (set by auth middleware)
	userID, err := getUserIDFromContext(c)
	if err != nil {
		return UnauthorizedResponse(c, "User not authenticated")
	}

	var req dto.DocumentTemplateCreateRequest
	if err := c.Bind().Body(&req); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	// Basic validation
	if req.Code == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Code is required")
	}
	if req.Name == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Name is required")
	}
	if req.DocTypeCode == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Document type code is required")
	}
	if req.FileID == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "File ID is required")
	}
	if req.PrevFileID == "" {
		return BadRequestResponse(c, "VALIDATION_ERROR", "Preview file ID is required")
	}

	result, err := h.service.Create(ctx, userID, req)
	if err != nil {
		return handleServiceError(c, err)
	}

	return CreatedResponse(c, "Document template created successfully", result)
}

// GetByID retrieves a document template by ID with all nested data
// GET /api/v1/fn/document-templates/:id
func (h *FNDocumentTemplateHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid template ID format")
	}

	result, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch template")
	}
	if result == nil {
		return NotFoundResponse(c, "Template not found")
	}

	return SuccessResponse(c, "Template retrieved successfully", result)
}

// GetByCode retrieves a document template by code with all nested data
// GET /api/v1/fn/document-templates/code/:code
func (h *FNDocumentTemplateHandler) GetByCode(c fiber.Ctx) error {
	ctx := c.Context()

	code := c.Params("code")
	if code == "" {
		return BadRequestResponse(c, "INVALID_CODE", "Template code is required")
	}

	result, err := h.service.GetByCode(ctx, code)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch template")
	}
	if result == nil {
		return NotFoundResponse(c, "Template not found")
	}

	return SuccessResponse(c, "Template retrieved successfully", result)
}

// List retrieves document templates with filters and pagination
// GET /api/v1/fn/document-templates?page=1&page_size=10&q=search&is_active=true&type_code=CERT&category_code=CAT1
func (h *FNDocumentTemplateHandler) List(c fiber.Ctx) error {
	ctx := c.Context()

	params := dto.DocumentTemplateListQuery{
		Page:     fiber.Query(c, "page", 1),
		PageSize: fiber.Query(c, "page_size", 10),
	}

	// Search query
	searchQuery := ""
	if q := c.Query("q"); q != "" {
		searchQuery = q
		params.SearchQuery = &q
	}

	// IsActive filter (default: true)
	isActiveStr := c.Query("is_active", "true")
	if isActiveStr != "" {
		isActive := isActiveStr == "true"
		params.IsActive = &isActive
	}

	// Type code filter
	if typeCode := c.Query("type_code"); typeCode != "" {
		params.TemplateTypeCode = &typeCode
	}

	// Category code filter
	if categoryCode := c.Query("category_code"); categoryCode != "" {
		params.TemplateCategoryCode = &categoryCode
	}

	items, total, err := h.service.List(ctx, params)
	if err != nil {
		return InternalErrorResponse(c, "Failed to list templates")
	}

	// Calculate pagination
	totalPages := int(total) / params.PageSize
	if int(total)%params.PageSize > 0 {
		totalPages++
	}

	// Build others (variable filters)
	others := []MetaFNFilter{}

	if params.IsActive != nil {
		others = append(others, MetaFNFilter{Key: "is_active", Value: *params.IsActive})
	}
	if params.TemplateTypeCode != nil && *params.TemplateTypeCode != "" {
		others = append(others, MetaFNFilter{Key: "type_code", Value: *params.TemplateTypeCode})
	}
	if params.TemplateCategoryCode != nil && *params.TemplateCategoryCode != "" {
		others = append(others, MetaFNFilter{Key: "category_code", Value: *params.TemplateCategoryCode})
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

// Update updates a document template
// PUT /api/v1/fn/document-templates/:id
func (h *FNDocumentTemplateHandler) Update(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid template ID format")
	}

	var req dto.DocumentTemplateUpdateRequest
	if err := c.Bind().Body(&req); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	result, err := h.service.Update(ctx, id, req)
	if err != nil {
		return handleServiceError(c, err)
	}

	return SuccessResponse(c, "Template updated successfully", result)
}

// Enable enables a document template
// PATCH /api/v1/fn/document-templates/:id/enable
func (h *FNDocumentTemplateHandler) Enable(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid template ID format")
	}

	if err := h.service.Enable(ctx, id); err != nil {
		return handleServiceError(c, err)
	}

	return SuccessResponse(c, "Template enabled successfully", nil)
}

// Disable disables a document template
// PATCH /api/v1/fn/document-templates/:id/disable
func (h *FNDocumentTemplateHandler) Disable(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid template ID format")
	}

	if err := h.service.Disable(ctx, id); err != nil {
		return handleServiceError(c, err)
	}

	return SuccessResponse(c, "Template disabled successfully", nil)
}

// Delete deletes a document template
// DELETE /api/v1/fn/document-templates/:id
func (h *FNDocumentTemplateHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid template ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return handleServiceError(c, err)
	}

	return NoContentResponse(c)
}

// Helper functions

func getUserIDFromContext(c fiber.Ctx) (uuid.UUID, error) {
	// Try to get from locals (set by Keycloak middleware)
	if userIDStr, ok := c.Locals("user_id").(string); ok {
		return uuid.Parse(userIDStr)
	}

	// Try UUID directly
	if userID, ok := c.Locals("user_id").(uuid.UUID); ok {
		return userID, nil
	}

	return uuid.Nil, fiber.NewError(fiber.StatusUnauthorized, "User not authenticated")
}

func handleServiceError(c fiber.Ctx, err error) error {
	errMsg := err.Error()

	// Check for specific error patterns
	switch {
	case contains(errMsg, "not found"):
		return NotFoundResponse(c, errMsg)
	case contains(errMsg, "already exists"):
		return ErrorResponse(c, fiber.StatusConflict, "CONFLICT", errMsg)
	case contains(errMsg, "invalid"), contains(errMsg, "required"):
		return BadRequestResponse(c, "VALIDATION_ERROR", errMsg)
	default:
		return InternalErrorResponse(c, errMsg)
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsImpl(s, substr))
}

func containsImpl(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}