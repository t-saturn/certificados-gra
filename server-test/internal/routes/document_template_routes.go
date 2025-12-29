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
	app.Get("/document-templates", httpwrap.Wrap(templateHandler.ListTemplates))
	app.Patch("/document-template/:id", httpwrap.Wrap(templateHandler.UpdateTemplate))
	app.Patch("/document-template/:id/disable", httpwrap.Wrap(templateHandler.DisableTemplate))
	app.Patch("/document-template/:id/enable", httpwrap.Wrap(templateHandler.EnableTemplate))
}
