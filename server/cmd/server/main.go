package main

import (
	"context"
	"time"

	"server/internal/background"
	"server/internal/config"
	"server/internal/middlewares"
	"server/internal/repositories"
	"server/internal/routes"
	"server/internal/services"
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

	if err := validator.InitValidator(); err != nil {
		logger.Log.Fatal().Msgf("Error al inicializar el validador: %v", err)
	}

	// Background runner: finalize PDFs (consume queue:docs:generate:done)
	docFinalizeRepo := repositories.NewDocumentPdfFinalizeRepository(config.DB)

	redisJobsRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	redisRepo := repositories.NewPdfJobRedisRepository(redisJobsRepo)

	finalizeSvc := services.NewPdfJobFinalizeService(config.DB, docFinalizeRepo, redisRepo, 50)
	runner := background.NewPdfFinalizeRunner(finalizeSvc, 3*time.Second)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	runner.Start(ctx)

	app := fiber.New(fiber.Config{
		ErrorHandler: middlewares.JSONErrorHandler,
	})

	app.Use(middlewares.CORSMiddleware())
	app.Use(middlewares.LoggerMiddleware())

	routes.RegisterRoutes(app)

	port := config.GetConfig().SERVERPort
	logger.Log.Info().Msgf("server-listening-in http://localhost:%s", port)
	if err := app.Listen(":" + port); err != nil {
		logger.Log.Fatal().Msgf("error-at-the-start-of-the-server: %v", err)
	}
}
