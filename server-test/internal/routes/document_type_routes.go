package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterDocumentTypeRoutes registra las rutas relacionadas a tipos de documentos
func RegisterDocumentTypeRoutes(app *fiber.App) {
	docTypeService := services.NewDocumentTypeService(config.DB)
	docTypeHandler := handlers.NewDocumentTypeHandler(docTypeService)

	app.Post("/document-type", httpwrap.Wrap(docTypeHandler.CreateType))
	app.Get("/document-types", httpwrap.Wrap(docTypeHandler.ListTypes))
	app.Patch("/document-type/:id", httpwrap.Wrap(docTypeHandler.UpdateType))
	app.Patch("/document-type/:id/disable", httpwrap.Wrap(docTypeHandler.DisableType))
	app.Patch("/document-type/:id/enable", httpwrap.Wrap(docTypeHandler.EnableType))
}
