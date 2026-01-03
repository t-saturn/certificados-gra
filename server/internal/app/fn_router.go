package app

import (
	"github.com/gofiber/fiber/v3"

	"server/internal/handler"
)

// FNHandlers groups all handlers for the FN (Functional) module
// This module provides endpoints with nested/enriched data responses
type FNHandlers struct {
	DocumentTemplate *handler.FNDocumentTemplateHandler
	// Future handlers:
	// Document         *handler.FNDocumentHandler
	// Event            *handler.FNEventHandler
	// EventParticipant *handler.FNEventParticipantHandler
}

// FNRouter handles FN (Functional) related routes
type FNRouter struct {
	h *FNHandlers
}

// NewFNRouter creates a new FNRouter instance
func NewFNRouter(handlers *FNHandlers) *FNRouter {
	return &FNRouter{h: handlers}
}

// SetupRoutes configures all FN routes (protected)
func (r *FNRouter) SetupRoutes(api fiber.Router) {
	fn := api.Group("/fn")

	r.setupDocumentTemplateRoutes(fn)
	// Future routes:
	// r.setupDocumentRoutes(fn)
	// r.setupEventRoutes(fn)
	// r.setupEventParticipantRoutes(fn)
}

// setupDocumentTemplateRoutes configures document template routes with nested data
func (r *FNRouter) setupDocumentTemplateRoutes(fn fiber.Router) {
	g := fn.Group("/document-templates")

	// List with filters and pagination
	// GET /api/v1/fn/document-templates?page=1&page_size=10&q=search&is_active=true&type_code=CERT&category_code=CAT1
	g.Get("/", r.h.DocumentTemplate.List)

	// Get by ID with all nested relations
	// GET /api/v1/fn/document-templates/:id
	g.Get("/:id", r.h.DocumentTemplate.GetByID)

	// Get by code with all nested relations
	// GET /api/v1/fn/document-templates/code/:code
	g.Get("/code/:code", r.h.DocumentTemplate.GetByCode)

	// Create new template with fields
	// POST /api/v1/fn/document-templates
	g.Post("/", r.h.DocumentTemplate.Create)

	// Update template
	// PUT /api/v1/fn/document-templates/:id
	g.Put("/:id", r.h.DocumentTemplate.Update)

	// Enable template
	// PATCH /api/v1/fn/document-templates/:id/enable
	g.Patch("/:id/enable", r.h.DocumentTemplate.Enable)

	// Disable template
	// PATCH /api/v1/fn/document-templates/:id/disable
	g.Patch("/:id/disable", r.h.DocumentTemplate.Disable)

	// Delete template
	// DELETE /api/v1/fn/document-templates/:id
	g.Delete("/:id", r.h.DocumentTemplate.Delete)
}