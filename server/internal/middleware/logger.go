package middleware

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/rs/zerolog/log"
)

func Logger() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Get request ID
		requestID := c.Locals("requestid")
		reqIDStr := ""
		if requestID != nil {
			reqIDStr = requestID.(string)
		}

		// Log request
		logger := log.With().
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("latency", time.Since(start)).
			Str("ip", c.IP()).
			Str("user_agent", c.Get("User-Agent")).
			Str("request_id", reqIDStr).
			Logger()

		statusCode := c.Response().StatusCode()
		switch {
		case statusCode >= 500:
			logger.Error().Msg("Server error")
		case statusCode >= 400:
			logger.Warn().Msg("Client error")
		default:
			logger.Info().Msg("Request completed")
		}

		return err
	}
}