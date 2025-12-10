package main

import (
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
	logger.Log.Info("Iniciando servidor...")

	config.LoadConfig()
	config.ConnectDB()

	if err := validator.InitValidator(); err != nil {
		logger.Log.Fatalf("Error al inicializar el validador: %v", err)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: middlewares.JSONErrorHandler,
	})

	app.Use(middlewares.CORSMiddleware())
	app.Use(middlewares.LoggerMiddleware())

	routes.RegisterRoutes(app)

	port := config.GetConfig().SERVERPort
	logger.Log.Infof("server-listening-in http://localhost:%s", port)
	if err := app.Listen(":" + port); err != nil {
		logger.Log.Fatalf("error-at-the-start-of-the-server: %v", err)
	}
}
