package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterDocumentCategoryRoutes registra las rutas relacionadas a categorías de documentos
func RegisterDocumentCategoryRoutes(app *fiber.App) {
	categoryService := services.NewDocumentCategoryService(config.DB)
	categoryHandler := handlers.NewDocumentCategoryHandler(categoryService)

	app.Post("/document-category", httpwrap.Wrap(categoryHandler.CreateCategory))
	app.Get("/document-categories", httpwrap.Wrap(categoryHandler.ListCategories))
	app.Patch("/document-category/:id", httpwrap.Wrap(categoryHandler.UpdateCategory))
	app.Patch("/document-category/:id/disable", httpwrap.Wrap(categoryHandler.SoftDeleteCategory))
	app.Patch("/document-category/:id/enable", httpwrap.Wrap(categoryHandler.EnableCategory))
}
