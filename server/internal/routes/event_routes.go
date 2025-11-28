package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

func RegisterEventRoutes(app *fiber.App) {
	notiService := services.NewNotificationService(config.DB)
	eventService := services.NewEventService(config.DB, notiService)
	eventHandler := handlers.NewEventHandler(eventService)

	app.Post("/events", httpwrap.Wrap(eventHandler.CreateEvent))
}
