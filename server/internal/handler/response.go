package handler

import (
	"github.com/gofiber/fiber/v2"
)

type Response struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type Meta struct {
	Page       int   `json:"page,omitempty"`
	Limit      int   `json:"limit,omitempty"`
	Total      int64 `json:"total,omitempty"`
	TotalPages int   `json:"total_pages,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, message string, data interface{}) error {
	return c.JSON(Response{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func SuccessWithMeta(c *fiber.Ctx, data interface{}, meta *Meta) error {
	return c.JSON(Response{
		Status: "success",
		Data:   data,
		Meta:   meta,
	})
}

func CreatedResponse(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(Response{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func NoContentResponse(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

func ErrorResponse(c *fiber.Ctx, status int, code string, message string) error {
	return c.Status(status).JSON(Response{
		Status: "error",
		Error: &ErrorInfo{
			Code:    code,
			Message: message,
		},
	})
}

func BadRequestResponse(c *fiber.Ctx, code string, message string) error {
	return ErrorResponse(c, fiber.StatusBadRequest, code, message)
}

func NotFoundResponse(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusNotFound, "NOT_FOUND", message)
}

func InternalErrorResponse(c *fiber.Ctx, message string) error {
	return ErrorResponse(c, fiber.StatusInternalServerError, "INTERNAL_ERROR", message)
}

// ErrorHandler is the global error handler for Fiber
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(Response{
		Status: "error",
		Error: &ErrorInfo{
			Code:    "FIBER_ERROR",
			Message: message,
		},
	})
}
