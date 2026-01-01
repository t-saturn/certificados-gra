package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog/log"

	"server/internal/config"
	"server/internal/handler"
	"server/internal/repository"
	"server/internal/router"
	"server/internal/service"
	"server/pkg/shared/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Initialize logger
	logger.Init(cfg.Server.Environment)

	log.Info().
		Str("environment", cfg.Server.Environment).
		Str("version", cfg.Server.Version).
		Msg("Starting cert-server")

	// Initialize PostgreSQL
	db, err := config.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	log.Info().Str("host", cfg.Database.Host).Msg("PostgreSQL connected")

	// Initialize Redis (optional)
	redisClient, err := config.NewRedisClient(cfg.Redis)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to connect to Redis, continuing without cache")
	} else {
		log.Info().Str("host", cfg.Redis.Host).Msg("Redis connected")
	}

	// Initialize NATS (optional)
	natsClient, err := config.NewNATSClient(cfg.NATS)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to connect to NATS, continuing without messaging")
	} else {
		log.Info().Str("url", cfg.NATS.URL).Msg("NATS connected")
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	docTypeRepo := repository.NewDocumentTypeRepository(db)

	// Initialize services
	userService := service.NewUserService(userRepo)
	docTypeService := service.NewDocumentTypeService(docTypeRepo)

	// Initialize handlers
	userHandler := handler.NewUserHandler(userService)
	docTypeHandler := handler.NewDocumentTypeHandler(docTypeService)

	// Initialize health handler with available connections
	var healthHandler *handler.HealthHandler
	switch {
	case redisClient != nil && natsClient != nil:
		healthHandler = handler.NewHealthHandler(db, redisClient.Client, natsClient.Conn)
	case redisClient != nil:
		healthHandler = handler.NewHealthHandler(db, redisClient.Client, nil)
	case natsClient != nil:
		healthHandler = handler.NewHealthHandler(db, nil, natsClient.Conn)
	default:
		healthHandler = handler.NewHealthHandler(db, nil, nil)
	}

	// Initialize router
	r := router.NewRouter(healthHandler, docTypeHandler, userHandler)
	app := r.Setup()

	// Start server
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)

	go func() {
		log.Info().Str("addr", addr).Msg("Server starting")
		if err := app.Listen(addr); err != nil {
			log.Fatal().Err(err).Msg("Server failed to start")
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	_, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown Fiber (v3 uses Shutdown instead of ShutdownWithContext)
	if err := app.Shutdown(); err != nil {
		log.Error().Err(err).Msg("Server shutdown error")
	}

	// Close NATS
	if natsClient != nil {
		natsClient.Close()
	}

	// Close Redis
	if redisClient != nil {
		_ = redisClient.Close()
	}

	// Close PostgreSQL
	sqlDB, _ := db.DB()
	if sqlDB != nil {
		_ = sqlDB.Close()
	}

	log.Info().Msg("Server shutdown complete")
}