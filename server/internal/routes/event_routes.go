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

	// Crear evento
	app.Post("/events", httpwrap.Wrap(eventHandler.CreateEvent))

	// Modificar detalles del evento
	app.Patch("/events/:id", httpwrap.Wrap(eventHandler.UpdateEvent))

	// Listar eventos (paginado + filtros)
	app.Get("/events", httpwrap.Wrap(eventHandler.ListEvents))
	// 🔹 Nuevo endpoint para subir participantes
	app.Patch("/events/:id/participants/upload", httpwrap.Wrap(eventHandler.UploadParticipants))
}
