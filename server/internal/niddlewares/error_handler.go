package middlewares

import (
	"server/internal/dto"

	"github.com/gofiber/fiber/v3"
)

func JSONErrorHandler(c fiber.Ctx, err error) error {
	return c.Status(fiber.StatusInternalServerError).JSON(dto.Response{
		Data:    nil,
		Status:  "failed",
		Message: err.Error(),
	})
}
