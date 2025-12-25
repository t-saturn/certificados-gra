package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/repositories"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// POST /event/:id
func RegisterEventActionRoutes(app *fiber.App) {
	// repos base
	queueRedisRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	queueRepo := repositories.NewPdfJobQueueRepository(queueRedisRepo)

	// nuevos repos
	templateFieldRepo := repositories.NewDocumentTemplateFieldRepository(config.DB)
	userDetailRepo := repositories.NewUserDetailRepository(config.DB)

	// service + handler
	svc := services.NewEventActionService(config.DB, queueRepo, templateFieldRepo, userDetailRepo)
	h := handlers.NewEventActionHandler(svc)

	app.Post("/event/:id", httpwrap.Wrap(h.RunEventAction))
}
