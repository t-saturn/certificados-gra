package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterDocumentTemplateRoutes registers the routes for document templates creation
func RegisterDocumentTemplateRoutes(app *fiber.App) {
	templateService := services.NewDocumentTemplateService(config.DB)
	templateHandler := handlers.NewDocumentTemplateHandler(templateService)

	app.Post("/document-template", httpwrap.Wrap(templateHandler.CreateTemplate))
}
