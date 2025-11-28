package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterRoutes configura las rutas de la aplicación
func RegisterRoutes(app *fiber.App) {
	service := services.NewHealthService("1.0.0", config.DB)
	handler := handlers.NewHealthHandler(service)

	app.Get("/health", httpwrap.Wrap(handler.GetHealth))

	RegisterTemplateRoutes(app)
	RegisterEventRoutes(app)
}
