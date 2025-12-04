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
	notificationService := services.NewNotificationService(config.DB)
	templateService := services.NewTemplateService(config.DB, notificationService)
	templateHandler := handlers.NewTemplateHandler(templateService)

	app.Post("/template", httpwrap.Wrap(templateHandler.CreateTemplate))
	app.Get("/templates", httpwrap.Wrap(templateHandler.ListTemplates))
	app.Patch("/template/:id", httpwrap.Wrap(templateHandler.UpdateTemplate))
}
