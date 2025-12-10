package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

// RegisterEventRoutes registra las rutas para eventos
func RegisterEventRoutes(app *fiber.App) {
	eventService := services.NewEventService(config.DB)
	eventHandler := handlers.NewEventHandler(eventService)

	// Crear evento (+ schedules + participantes opcionales)
	app.Post("/event", httpwrap.Wrap(eventHandler.CreateEvent))

	// Listar eventos
	app.Get("/events", httpwrap.Wrap(eventHandler.ListEvents))

	// Obtener detalle de un evento
	app.Get("/event/:id", httpwrap.Wrap(eventHandler.GetEvent))
}
