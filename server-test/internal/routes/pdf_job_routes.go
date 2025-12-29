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
	redisJobsRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	queueRepo := repositories.NewPdfJobQueueRepository(redisJobsRepo)

	pdfJobSvc := services.NewPdfJobService(config.DB, queueRepo)
	h := handlers.NewPdfJobHandler(pdfJobSvc)

	app.Post("/pdf-jobs/generate-docs", httpwrap.Wrap(h.GenerateDocs))
}
