package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/repositories"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

func RegisterEventActionRoutes(app *fiber.App) {
	redisJobsRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	queueRepo := repositories.NewPdfJobQueueRepository(redisJobsRepo)

	svc := services.NewEventActionService(config.DB, queueRepo)
	h := handlers.NewEventActionHandler(svc)

	app.Post("/event/:id", httpwrap.Wrap(h.RunEventAction))
}
