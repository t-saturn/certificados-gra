package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

func RegisterEventActionRoutes(app *fiber.App) {
	svc := services.NewEventActionService(config.DB)
	h := handlers.NewEventActionHandler(svc)

	// pedido: POST /event/:id
	app.Post("/event/:id", httpwrap.Wrap(h.RunEventAction))

	// opcional: alias consistente con otros endpoints
	// app.Post("/events/:id", httpwrap.Wrap(h.RunEventAction))
}
