package handler

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db    *gorm.DB
	redis *redis.Client
	nats  *nats.Conn
}

type HealthStatus struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services,omitempty"`
}

func NewHealthHandler(db *gorm.DB, redis *redis.Client, nats *nats.Conn) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
		nats:  nats,
	}
}

func (h *HealthHandler) Health(c fiber.Ctx) error {
	return c.JSON(HealthStatus{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *HealthHandler) Ready(c fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	services := make(map[string]string)
	allHealthy := true

	// Check PostgreSQL
	if h.db != nil {
		sqlDB, err := h.db.DB()
		if err != nil || sqlDB.PingContext(ctx) != nil {
			services["postgres"] = "unhealthy"
			allHealthy = false
		} else {
			services["postgres"] = "healthy"
		}
	}

	// Check Redis
	if h.redis != nil {
		if err := h.redis.Ping(ctx).Err(); err != nil {
			services["redis"] = "unhealthy"
			allHealthy = false
		} else {
			services["redis"] = "healthy"
		}
	}

	// Check NATS
	if h.nats != nil {
		if h.nats.IsConnected() {
			services["nats"] = "healthy"
		} else {
			services["nats"] = "unhealthy"
			allHealthy = false
		}
	}

	status := HealthStatus{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
	}

	if !allHealthy {
		status.Status = "degraded"
		return c.Status(fiber.StatusServiceUnavailable).JSON(status)
	}

	return c.JSON(status)
}