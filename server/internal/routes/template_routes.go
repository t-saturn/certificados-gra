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
	templateService := services.NewDocumentTemplateService(config.DB)
	templateHandler := handlers.NewDocumentTemplateHandler(templateService)

	app.Post("/template", httpwrap.Wrap(templateHandler.CreateTemplate))
	app.Get("/templates", httpwrap.Wrap(templateHandler.ListTemplates))
	app.Patch("/template/:id", httpwrap.Wrap(templateHandler.UpdateTemplate))
	app.Patch("/template/:id/disable", httpwrap.Wrap(templateHandler.DisableTemplate))
	app.Patch("/template/:id/enable", httpwrap.Wrap(templateHandler.EnableTemplate))
}
