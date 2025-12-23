package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/repositories"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

func RegisterPdfJobRoutes(app *fiber.App) {
	// deps
	docRepo := repositories.NewDocumentRepository(config.DB)
	queueRepo := repositories.NewPdfJobQueueRepository(config.GetRedis())

	cfg := config.GetConfig()

	svc := services.NewPdfJobService(
		config.DB,
		docRepo,
		queueRepo,
		cfg.REDISQueueDocsGenerate,
	)

	h := handlers.NewPdfJobHandler(svc)

	g := app.Group("/pdf-jobs")
	g.Post("/generate-docs", httpwrap.Wrap(h.EnqueueGenerateDocs))
}
