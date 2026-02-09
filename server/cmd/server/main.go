package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"server/internal/app"
	"server/internal/config"
	"server/internal/middleware"
	"server/pkg/shared/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger (must be first after config)
	logger.Init(cfg.Server.Environment)

	// Validate Keycloak configuration (required)
	if !cfg.IsKeycloakConfigured() {
		log.Fatal().
			Str("KEYCLOAK_SSO_URL", cfg.Keycloak.SSOURL).
			Str("KEYCLOAK_REALM", cfg.Keycloak.Realm).
			Msg("Keycloak configuration is required")
	}

	// Initialize Keycloak middleware (required)
	if err := initKeycloak(cfg); err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize Keycloak")
	}

	// Initialize connections
	conn := initConnections(cfg)

	// Initialize application
	application := app.New(app.Config{
		DB:    conn.db,
		Redis: conn.redis,
		NATS:  conn.nats,
	})

	// Start server
	go startServer(application, cfg)

	// Wait for shutdown signal
	waitForShutdown(application)
}

// initKeycloak initializes Keycloak authentication
func initKeycloak(cfg *config.Config) error {
	return middleware.InitKeycloakMiddleware(middleware.KeycloakConfig{
		SSOURL: cfg.Keycloak.SSOURL,
		Realm:  cfg.Keycloak.Realm,
	})
}

// connections holds all database/service connections
type connections struct {
	db    *gorm.DB
	redis *redis.Client
	nats  *nats.Conn
}

// initConnections initializes all external connections
func initConnections(cfg *config.Config) *connections {
	conn := &connections{}

	// PostgreSQL (required)
	db, err := config.NewPostgresDB(cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to PostgreSQL")
	}
	conn.db = db
	log.Info().Str("host", cfg.Database.Host).Msg("PostgreSQL connected")

	// Redis (optional)
	redisClient, err := config.NewRedisClient(cfg.Redis)
	if err != nil {
		log.Warn().Err(err).Msg("Redis unavailable, continuing without cache")
	} else {
		conn.redis = redisClient.Client
		log.Info().Str("host", cfg.Redis.Host).Msg("Redis connected")
	}

	// NATS (optional)
	natsClient, err := config.NewNATSClient(cfg.NATS)
	if err != nil {
		log.Warn().Err(err).Msg("NATS unavailable, continuing without messaging")
	} else {
		conn.nats = natsClient.Conn
		log.Info().Str("url", cfg.NATS.URL).Msg("NATS connected")
	}

	return conn
}

// startServer starts the HTTP server
func startServer(application *app.App, cfg *config.Config) {
	addr := fmt.Sprintf("%s:%s", cfg.Server.Host, cfg.Server.Port)
	log.Info().Str("addr", addr).Msg("Server starting")

	if err := application.Fiber().Listen(addr); err != nil {
		log.Fatal().Err(err).Msg("Server failed")
	}
}

// waitForShutdown waits for interrupt signal and performs graceful shutdown
func waitForShutdown(application *app.App) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use context for shutdown timeout tracking
	done := make(chan struct{})
	go func() {
		if err := application.Shutdown(); err != nil {
			log.Error().Err(err).Msg("Shutdown error")
		}
		close(done)
	}()

	select {
	case <-done:
		log.Info().Msg("Server shutdown complete")
	case <-ctx.Done():
		log.Warn().Msg("Shutdown timeout exceeded")
	}
}