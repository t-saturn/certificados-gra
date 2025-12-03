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

	// Crear tipo
	app.Post("/document-type", httpwrap.Wrap(docTypeHandler.CreateType))

	// Listar tipos (con categories dentro de cada item)
	app.Get("/document-types", httpwrap.Wrap(docTypeHandler.ListTypes))

	// Actualizar tipo
	app.Patch("/document-type/:id", httpwrap.Wrap(docTypeHandler.UpdateType))

	// Deshabilitar tipo (is_active = false)
	app.Patch("/document-type/:id/disable", httpwrap.Wrap(docTypeHandler.DisableType))

	// Habilitar tipo (is_active = true)
	app.Patch("/document-type/:id/enable", httpwrap.Wrap(docTypeHandler.EnableType))
}
