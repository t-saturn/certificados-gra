package middlewares

import (
	"server/pkgs/logger"
	"time"

	"github.com/gofiber/fiber/v3"
)

func LoggerMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		stop := time.Now()
		latency := stop.Sub(start)

		entry := logger.Log.With().
			Int("status", c.Response().StatusCode()).
			Str("method", c.Method()).
			Str("path", c.OriginalURL()).
			Dur("latency", latency).
			Str("ip", c.IP()).
			Str("userAgent", c.Get("User-Agent")).
			Logger()

		if err != nil {
			entry.Error().Err(err).Msg("HTTP request")
		} else {
			entry.Info().Msg("HTTP request")
		}

		return err
	}
}
