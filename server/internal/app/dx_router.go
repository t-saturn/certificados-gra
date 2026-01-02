package app

import (
	"github.com/gofiber/fiber/v3"

	"server/internal/handler"
)

// DXRouter handles DX (Document Exchange) related routes
type DXRouter struct {
	healthHandler       *handler.HealthHandler
	documentTypeHandler *handler.DocumentTypeHandler
	userHandler         *handler.UserHandler
}

// NewDXRouter creates a new DXRouter instance
func NewDXRouter(
	healthHandler *handler.HealthHandler,
	documentTypeHandler *handler.DocumentTypeHandler,
	userHandler *handler.UserHandler,
) *DXRouter {
	return &DXRouter{
		healthHandler:       healthHandler,
		documentTypeHandler: documentTypeHandler,
		userHandler:         userHandler,
	}
}

// SetupHealthRoutes configures health check routes (public)
func (r *DXRouter) SetupHealthRoutes(app *fiber.App) {
	app.Get("/health", r.healthHandler.Health)
	app.Get("/ready", r.healthHandler.Ready)
}

// SetupRoutes configures all DX routes (protected)
func (r *DXRouter) SetupRoutes(api fiber.Router) {
	r.setupDocumentTypeRoutes(api)
	r.setupUserRoutes(api)
}

// setupDocumentTypeRoutes configures document type routes
func (r *DXRouter) setupDocumentTypeRoutes(api fiber.Router) {
	docTypes := api.Group("/document-types")
	docTypes.Get("/", r.documentTypeHandler.GetAll)
	docTypes.Get("/active", r.documentTypeHandler.GetActive)
	docTypes.Get("/:id", r.documentTypeHandler.GetByID)
	docTypes.Get("/code/:code", r.documentTypeHandler.GetByCode)
	docTypes.Post("/", r.documentTypeHandler.Create)
	docTypes.Put("/:id", r.documentTypeHandler.Update)
	docTypes.Delete("/:id", r.documentTypeHandler.Delete)
}

// setupUserRoutes configures user routes
func (r *DXRouter) setupUserRoutes(api fiber.Router) {
	users := api.Group("/users")
	users.Get("/", r.userHandler.GetAll)
	users.Get("/:id", r.userHandler.GetByID)
	users.Post("/", r.userHandler.Create)
	users.Put("/:id", r.userHandler.Update)
	users.Delete("/:id", r.userHandler.Delete)
}