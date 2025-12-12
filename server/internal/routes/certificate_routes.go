package routes

import (
	"server/internal/config"
	"server/internal/handlers"
	"server/internal/services"
	"server/pkgs/httpwrap"

	"github.com/gofiber/fiber/v3"
)

func RegisterCertificateRoutes(app *fiber.App) {
	certService := services.NewCertificateService(config.DB)
	certHandler := handlers.NewCertificateHandler(certService)

	app.Get("/certificates", httpwrap.Wrap(certHandler.ListCertificates))
	app.Get("/certificates/:id", httpwrap.Wrap(certHandler.GetCertificateByID))
}
