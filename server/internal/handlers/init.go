package handlers

import (
	"strings"

	"server/internal/services"

	"github.com/gofiber/fiber/v3"
)

// HealthHandler gestiona las solicitudes de estado del sistema
type HealthHandler struct {
	service services.HealthService
}

// NewHealthHandler crea un nuevo handler de health
func NewHealthHandler(service services.HealthService) *HealthHandler {
	return &HealthHandler{service: service}
}

// GET /health?db=true|false
func (h *HealthHandler) GetHealth(c fiber.Ctx) (interface{}, string, error) {
	includeDB := strings.EqualFold(c.Query("db"), "true")
	status := h.service.Check(includeDB)
	return status, "ok", nil
}
