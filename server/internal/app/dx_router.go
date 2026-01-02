package app

import (
	"github.com/gofiber/fiber/v3"

	"server/internal/handler"
)

// DXRouter handles DX (Document Exchange) related routes
type DXRouter struct {
	healthHandler       *handler.HealthHandler
	userHandler         *handler.UserHandler
	userDetailHandler   *handler.UserDetailHandler
	documentTypeHandler *handler.DocumentTypeHandler
	eventHandler        *handler.EventHandler
}

// NewDXRouter creates a new DXRouter instance
func NewDXRouter(
	healthHandler *handler.HealthHandler,
	userHandler *handler.UserHandler,
	userDetailHandler *handler.UserDetailHandler,
	documentTypeHandler *handler.DocumentTypeHandler,
	eventHandler *handler.EventHandler,
) *DXRouter {
	return &DXRouter{
		healthHandler:       healthHandler,
		userHandler:         userHandler,
		userDetailHandler:   userDetailHandler,
		documentTypeHandler: documentTypeHandler,
		eventHandler:        eventHandler,
	}
}

// SetupHealthRoutes configures health check routes (public)
func (r *DXRouter) SetupHealthRoutes(app *fiber.App) {
	app.Get("/health", r.healthHandler.Health)
	app.Get("/ready", r.healthHandler.Ready)
}

// SetupRoutes configures all DX routes (protected)
func (r *DXRouter) SetupRoutes(api fiber.Router) {
	r.setupUserRoutes(api)
	r.setupUserDetailRoutes(api)
	r.setupDocumentTypeRoutes(api)
	r.setupEventRoutes(api)
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

// setupUserDetailRoutes configures user detail routes (beneficiaries)
func (r *DXRouter) setupUserDetailRoutes(api fiber.Router) {
	details := api.Group("/user-details")
	details.Get("/", r.userDetailHandler.GetAll)
	details.Get("/:id", r.userDetailHandler.GetByID)
	details.Get("/dni/:nationalId", r.userDetailHandler.GetByNationalID)
	details.Post("/", r.userDetailHandler.Create)
	details.Put("/:id", r.userDetailHandler.Update)
	details.Delete("/:id", r.userDetailHandler.Delete)
}

// setupEventRoutes configures event routes
func (r *DXRouter) setupEventRoutes(api fiber.Router) {
	events := api.Group("/events")
	events.Get("/", r.eventHandler.GetAll)
	events.Get("/public", r.eventHandler.GetPublic)
	events.Get("/status/:status", r.eventHandler.GetByStatus)
	events.Get("/:id", r.eventHandler.GetByID)
	events.Get("/code/:code", r.eventHandler.GetByCode)
	events.Post("/", r.eventHandler.Create)
	events.Put("/:id", r.eventHandler.Update)
	events.Delete("/:id", r.eventHandler.Delete)
}