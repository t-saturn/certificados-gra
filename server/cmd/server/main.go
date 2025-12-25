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

	// Config + conexiones
	config.LoadConfig()
	config.ConnectDB()
	config.ConnectRedis()

	if err := validator.InitValidator(); err != nil {
		logger.Log.Fatal().Msgf("Error al inicializar el validador: %v", err)
	}

	cfg := config.GetConfig()

	// Background runner:
	// consume queue:docs:generate:done y finaliza PDFs en BD

	// Repo que inserta en document_pdfs y actualiza documents
	docFinalizeRepo := repositories.NewDocumentPdfFinalizeRepository(config.DB)

	// Redis repos: BRPOP done + LRANGE results/errors
	redisJobsRepo := repositories.NewRedisJobsRepository(config.GetRedis())
	pdfJobRedisRepo := repositories.NewPdfJobRedisRepository(redisJobsRepo)

	// Service que procesa N jobs por tick (batchSize=50)
	finalizeSvc := services.NewPdfJobFinalizeService(
		config.DB,
		docFinalizeRepo,
		pdfJobRedisRepo,
		50,
	)

	// Runner: cada 3s corre finalizeSvc.Tick/RunOnce (según tu implementación)
	runner := background.NewPdfFinalizeRunner(finalizeSvc, 3*time.Second)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger.Log.Info().
		Str("done_queue", cfg.REDISQueueDocsDone).
		Dur("interval", 3*time.Second).
		Int("batch_size", 50).
		Msg("pdf-finalize runner starting")

	runner.Start(ctx)

	// HTTP server
	app := fiber.New(fiber.Config{
		ErrorHandler: middlewares.JSONErrorHandler,
	})

	app.Use(middlewares.CORSMiddleware())
	app.Use(middlewares.LoggerMiddleware())

	routes.RegisterRoutes(app)

	port := cfg.SERVERPort
	logger.Log.Info().Msgf("server-listening-in http://localhost:%s", port)

	if err := app.Listen(":" + port); err != nil {
		logger.Log.Fatal().Msgf("error-at-the-start-of-the-server: %v", err)
	}
}
