package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterTemplateRoutes registra las rutas relacionadas a plantillas
func RegisterTemplateRoutes(app *fiber.App) {
	templateService := services.NewTemplateService(config.DB)
	templateHandler := handlers.NewTemplateHandler(templateService)

	// POST /template?user_id=<uuid>
	app.Post("/template", httpwrap.Wrap(templateHandler.CreateTemplate))
}
