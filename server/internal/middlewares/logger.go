package middlewares

import (
	"server/pkgs/logger"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/sirupsen/logrus"
)

func LoggerMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		stop := time.Now()
		latency := stop.Sub(start)

		entry := logger.Log.WithFields(logrus.Fields{
			"status":    c.Response().StatusCode(),
			"method":    c.Method(),
			"path":      c.OriginalURL(),
			"latency":   latency,
			"ip":        c.IP(),
			"userAgent": c.Get("User-Agent"),
		})

		if err != nil {
			entry.Error(err)
		} else {
			entry.Info("HTTP request")
		}

		return err
	}
}
