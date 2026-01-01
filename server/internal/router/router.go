package router

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"server/internal/handler"
	"server/internal/middleware"
)

type Router struct {
	app                 *fiber.App
	healthHandler       *handler.HealthHandler
	documentTypeHandler *handler.DocumentTypeHandler
	userHandler         *handler.UserHandler
}

func NewRouter(
	healthHandler *handler.HealthHandler,
	documentTypeHandler *handler.DocumentTypeHandler,
	userHandler *handler.UserHandler,
) *Router {
	return &Router{
		healthHandler:       healthHandler,
		documentTypeHandler: documentTypeHandler,
		userHandler:         userHandler,
	}
}

func (r *Router) Setup() *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: handler.ErrorHandler,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(cors.New())
	app.Use(middleware.Logger())

	// Health routes
	app.Get("/health", r.healthHandler.Health)
	app.Get("/ready", r.healthHandler.Ready)

	// API v1 routes
	api := app.Group("/api/v1")

	// Document types
	docTypes := api.Group("/document-types")
	docTypes.Get("/", r.documentTypeHandler.GetAll)
	docTypes.Get("/active", r.documentTypeHandler.GetActive)
	docTypes.Get("/:id", r.documentTypeHandler.GetByID)
	docTypes.Get("/code/:code", r.documentTypeHandler.GetByCode)
	docTypes.Post("/", r.documentTypeHandler.Create)
	docTypes.Put("/:id", r.documentTypeHandler.Update)
	docTypes.Delete("/:id", r.documentTypeHandler.Delete)

	// Users
	users := api.Group("/users")
	users.Get("/", r.userHandler.GetAll)
	users.Get("/:id", r.userHandler.GetByID)
	users.Post("/", r.userHandler.Create)
	users.Put("/:id", r.userHandler.Update)
	users.Delete("/:id", r.userHandler.Delete)

	r.app = app
	return app
}

func (r *Router) App() *fiber.App {
	return r.app
}