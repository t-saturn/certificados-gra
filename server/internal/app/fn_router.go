package app

import (
	"github.com/gofiber/fiber/v3"

	"server/internal/handler"
)

// FNHandlers groups all handlers for the FN (Functional) module
type FNHandlers struct {
	DocumentTemplate *handler.FNDocumentTemplateHandler
	Event            *handler.FNEventHandler
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
	r.setupEventRoutes(fn)
}

// setupDocumentTemplateRoutes configures document template routes with nested data
func (r *FNRouter) setupDocumentTemplateRoutes(fn fiber.Router) {
	g := fn.Group("/document-templates")

	g.Get("/", r.h.DocumentTemplate.List)
	g.Get("/:id", r.h.DocumentTemplate.GetByID)
	g.Get("/code/:code", r.h.DocumentTemplate.GetByCode)
	g.Post("/", r.h.DocumentTemplate.Create)
	g.Put("/:id", r.h.DocumentTemplate.Update)
	g.Patch("/:id/enable", r.h.DocumentTemplate.Enable)
	g.Patch("/:id/disable", r.h.DocumentTemplate.Disable)
	g.Delete("/:id", r.h.DocumentTemplate.Delete)
}

// setupEventRoutes configures event routes with nested data
func (r *FNRouter) setupEventRoutes(fn fiber.Router) {
	g := fn.Group("/events")

	g.Get("/", r.h.Event.List)
	g.Get("/:id", r.h.Event.GetByID)
	g.Get("/code/:code", r.h.Event.GetByCode)
	g.Post("/", r.h.Event.Create)
	g.Put("/:id", r.h.Event.Update)
	g.Delete("/:id", r.h.Event.Delete)
}