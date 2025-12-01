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
	app.Get("/event-detail", httpwrap.Wrap(eventHandler.GetEventDetail))

	// Listar eventos (paginado + filtros)
	app.Get("/events", httpwrap.Wrap(eventHandler.ListEvents))
	// 🔹 Nuevo endpoint para subir participantes
	app.Patch("/events/:id/participants/upload", httpwrap.Wrap(eventHandler.UploadParticipants))
	// 🔹 Nueva ruta: eliminar participante
	app.Delete("/events/:event_id/participants/remove/:participant_id", httpwrap.Wrap(eventHandler.RemoveParticipant))
	// 👇 nuevo
	app.Get("/events/:event_id/participant/list", httpwrap.Wrap(eventHandler.ListEventParticipants))
	// 👇 certificados
	app.Post("/events/:event_id/certificate/generate", httpwrap.Wrap(eventHandler.GenerateCertificates))
	app.Post("/events/:event_id/certificate/sign", httpwrap.Wrap(eventHandler.SignCertificates))
	app.Post("/events/:event_id/certificate/publish", httpwrap.Wrap(eventHandler.PublishCertificates))
}
