package httpwrap

import (
	"server/internal/dto"

	"github.com/gofiber/fiber/v3"
)

type HandlerFunc func(c fiber.Ctx) (data interface{}, message string, err error)

func Wrap(h HandlerFunc) fiber.Handler {
	return func(c fiber.Ctx) error {
		data, message, err := h(c)
		if err != nil {
			// Aquí puedes mapear err a códigos específicos
			return c.Status(fiber.StatusBadRequest).JSON(dto.Response{
				Data:    nil,
				Status:  "failed",
				Message: err.Error(),
			})
		}
		return c.Status(fiber.StatusOK).JSON(dto.Response{
			Data:    data,
			Status:  "success",
			Message: message,
		})
	}
}
