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

	// Crear categoría
	app.Post("/document-category", httpwrap.Wrap(categoryHandler.CreateCategory))

	// Listar categorías (con paginado + search_query)
	app.Get("/document-categories", httpwrap.Wrap(categoryHandler.ListCategories))
}
