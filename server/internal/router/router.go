package router

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"

	"server/internal/handler"
	"server/internal/middleware"
)

type Router struct {
	app            *fiber.App
	userHandler    *handler.UserHandler
	docTypeHandler *handler.DocumentTypeHandler
	healthHandler  *handler.HealthHandler
}

func New(
	userHandler *handler.UserHandler,
	docTypeHandler *handler.DocumentTypeHandler,
	healthHandler *handler.HealthHandler,
) *Router {
	return &Router{
		userHandler:    userHandler,
		docTypeHandler: docTypeHandler,
		healthHandler:  healthHandler,
	}
}

func (r *Router) Setup(serviceName string) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:               serviceName,
		DisableStartupMessage: false,
		ErrorHandler:          handler.ErrorHandler,
		ReadTimeout:           10 * time.Second,
		WriteTimeout:          10 * time.Second,
		IdleTimeout:           120 * time.Second,
	})

	// Global middleware
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	app.Use(requestid.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID",
		ExposeHeaders:    "Content-Length,X-Request-ID",
		AllowCredentials: false,
		MaxAge:           86400,
	}))

	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))

	app.Use(middleware.Logger())

	// Rate limiter
	app.Use(limiter.New(limiter.Config{
		Max:               100,
		Expiration:        1 * time.Minute,
		LimiterMiddleware: limiter.SlidingWindow{},
	}))

	r.app = app
	r.setupRoutes()

	return app
}

func (r *Router) setupRoutes() {
	// Health routes
	r.app.Get("/health", r.healthHandler.Health)
	r.app.Get("/ready", r.healthHandler.Ready)

	// API v1
	api := r.app.Group("/api/v1")

	// Users
	users := api.Group("/users")
	users.Get("/", r.userHandler.GetAll)
	users.Get("/:id", r.userHandler.GetByID)
	users.Post("/", r.userHandler.Create)
	users.Put("/:id", r.userHandler.Update)
	users.Delete("/:id", r.userHandler.Delete)

	// Document Types
	docTypes := api.Group("/document-types")
	docTypes.Get("/", r.docTypeHandler.GetAll)
	docTypes.Get("/active", r.docTypeHandler.GetActive)
	docTypes.Get("/code/:code", r.docTypeHandler.GetByCode)
	docTypes.Get("/:id", r.docTypeHandler.GetByID)
	docTypes.Post("/", r.docTypeHandler.Create)
	docTypes.Put("/:id", r.docTypeHandler.Update)
	docTypes.Delete("/:id", r.docTypeHandler.Delete)
}
