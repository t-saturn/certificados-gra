package app

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"

	"server/internal/handler"
	"server/internal/middleware"
)

// Router handles HTTP routing
type Router struct {
	app      *fiber.App
	dxRouter *DXRouter
	// fnRouter *FNRouter // Future
}

// RouterConfig holds handler groups for each module
type RouterConfig struct {
	DX *DXHandlers
	// FN *FNHandlers // Future
}

// NewRouter creates a new Router instance
func NewRouter(cfg RouterConfig) *Router {
	return &Router{
		dxRouter: NewDXRouter(cfg.DX),
		// fnRouter: NewFNRouter(cfg.FN), // Future
	}
}

// Setup configures all routes and middleware
func (r *Router) Setup() *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: handler.ErrorHandler,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(middleware.CORS())
	app.Use(middleware.Logger())

	// Health routes (public - no auth required)
	r.dxRouter.SetupHealthRoutes(app)

	// API v1 routes (protected)
	api := app.Group("/api/v1")
	api.Use(middleware.KeycloakAuth())

	// Setup sub-routers
	r.dxRouter.SetupRoutes(api)
	// r.fnRouter.SetupRoutes(api) // Future

	r.app = app
	return app
}

// App returns the Fiber app instance
func (r *Router) App() *fiber.App {
	return r.app
}