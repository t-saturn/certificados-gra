package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

// CORSConfig configuración para CORS
type CORSConfig struct {
	AllowOrigins     string
	AllowMethods     string
	AllowHeaders     string
	AllowCredentials bool
	ExposeHeaders    string
	MaxAge           int
}

// DefaultCORSConfig configuración por defecto
var DefaultCORSConfig = CORSConfig{
	AllowOrigins:     "*",
	AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
	AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Request-ID",
	AllowCredentials: false,
	ExposeHeaders:    "Content-Length,Content-Type",
	MaxAge:           86400, // 24 hours
}

// CORS middleware con configuración por defecto
func CORS() fiber.Handler {
	return CORSWithConfig(DefaultCORSConfig)
}

// CORSWithConfig middleware con configuración personalizada
func CORSWithConfig(config CORSConfig) fiber.Handler {
	return func(c fiber.Ctx) error {
		origin := c.Get("Origin")

		// Si no hay origin, continuar
		if origin == "" {
			return c.Next()
		}

		// Verificar si el origin está permitido
		allowOrigin := ""
		if config.AllowOrigins == "*" {
			allowOrigin = "*"
		} else {
			origins := strings.Split(config.AllowOrigins, ",")
			for _, o := range origins {
				o = strings.TrimSpace(o)
				if o == origin {
					allowOrigin = origin
					break
				}
			}
		}

		// Si el origin no está permitido, continuar sin headers CORS
		if allowOrigin == "" {
			return c.Next()
		}

		// Establecer headers CORS
		c.Set("Access-Control-Allow-Origin", allowOrigin)

		if config.AllowCredentials {
			c.Set("Access-Control-Allow-Credentials", "true")
		}

		if config.ExposeHeaders != "" {
			c.Set("Access-Control-Expose-Headers", config.ExposeHeaders)
		}

		// Manejar preflight request
		if c.Method() == fiber.MethodOptions {
			c.Set("Access-Control-Allow-Methods", config.AllowMethods)
			c.Set("Access-Control-Allow-Headers", config.AllowHeaders)

			if config.MaxAge > 0 {
				c.Set("Access-Control-Max-Age", string(rune(config.MaxAge)))
			}

			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}