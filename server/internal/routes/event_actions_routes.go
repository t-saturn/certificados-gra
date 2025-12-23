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
	cfg := config.GetConfig()

	redisRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	svc := services.NewEventActionService(config.DB, redisRepo, cfg)
	h := handlers.NewEventActionHandler(svc)

	app.Post("/event/:id", httpwrap.Wrap(h.RunEventAction))
}
