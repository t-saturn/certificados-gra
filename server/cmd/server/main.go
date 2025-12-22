package main

import (
	"os"
	"os/signal"
	"syscall"

	"server/internal/config"
	"server/internal/middlewares"
	"server/internal/routes"
	"server/pkgs/logger"
	"server/pkgs/validator"

	"github.com/gofiber/fiber/v3"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	logger.InitLogger()
	logger.Log.Info().Msg("Iniciando servidor...")

	config.LoadConfig()
	config.ConnectDB()
	config.ConnectRedis()
	defer config.CloseRedis()

	if err := validator.InitValidator(); err != nil {
		logger.Log.Fatal().Msgf("Error al inicializar el validador: %v", err)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: middlewares.JSONErrorHandler,
	})

	app.Use(middlewares.CORSMiddleware())
	app.Use(middlewares.LoggerMiddleware())

	routes.RegisterRoutes(app)

	// Shutdown graceful (opcional, pero útil)
	go func() {
		ch := make(chan os.Signal, 1)
		signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
		<-ch
		logger.Log.Info().Msg("Shutting down server...")
		_ = app.Shutdown()
	}()

	port := config.GetConfig().SERVERPort
	logger.Log.Info().Msgf("server-listening-in http://localhost:%s", port)
	if err := app.Listen(":" + port); err != nil {
		logger.Log.Fatal().Msgf("error-at-the-start-of-the-server: %v", err)
	}
}
