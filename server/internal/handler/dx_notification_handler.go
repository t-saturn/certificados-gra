package handler

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"server/internal/domain/models"
	"server/internal/service"
)

type NotificationHandler struct {
	service *service.NotificationService
}

func NewNotificationHandler(service *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func (h *NotificationHandler) GetByID(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid notification ID format")
	}

	notification, err := h.service.GetByID(ctx, id)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch notification")
	}
	if notification == nil {
		return NotFoundResponse(c, "Notification not found")
	}

	return SuccessResponse(c, "Notification retrieved", notification)
}

func (h *NotificationHandler) GetByUserID(c fiber.Ctx) error {
	ctx := c.Context()

	userIDParam := c.Params("userId")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	limit := fiber.Query(c, "limit", 10)
	offset := fiber.Query(c, "offset", 0)

	notifications, unreadCount, err := h.service.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch notifications")
	}

	return SuccessWithMeta(c, notifications, &Meta{
		Limit: limit,
		Total: unreadCount,
	})
}

func (h *NotificationHandler) GetUnreadByUserID(c fiber.Ctx) error {
	ctx := c.Context()

	userIDParam := c.Params("userId")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	notifications, count, err := h.service.GetUnreadByUserID(ctx, userID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to fetch unread notifications")
	}

	return SuccessWithMeta(c, notifications, &Meta{
		Total: count,
	})
}

func (h *NotificationHandler) CountUnreadByUserID(c fiber.Ctx) error {
	ctx := c.Context()

	userIDParam := c.Params("userId")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	count, err := h.service.CountUnreadByUserID(ctx, userID)
	if err != nil {
		return InternalErrorResponse(c, "Failed to count unread notifications")
	}

	return SuccessResponse(c, "Unread count retrieved", fiber.Map{
		"user_id":      userID,
		"unread_count": count,
	})
}

func (h *NotificationHandler) Create(c fiber.Ctx) error {
	ctx := c.Context()

	var input models.Notification
	if err := c.Bind().Body(&input); err != nil {
		return BadRequestResponse(c, "INVALID_BODY", "Invalid request body")
	}

	notification, err := h.service.Create(ctx, &input)
	if err != nil {
		return InternalErrorResponse(c, "Failed to create notification")
	}

	return CreatedResponse(c, "Notification created", notification)
}

func (h *NotificationHandler) MarkAsRead(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid notification ID format")
	}

	if err := h.service.MarkAsRead(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to mark notification as read")
	}

	return SuccessResponse(c, "Notification marked as read", nil)
}

func (h *NotificationHandler) MarkAllAsRead(c fiber.Ctx) error {
	ctx := c.Context()

	userIDParam := c.Params("userId")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid user ID format")
	}

	if err := h.service.MarkAllAsRead(ctx, userID); err != nil {
		return InternalErrorResponse(c, "Failed to mark all notifications as read")
	}

	return SuccessResponse(c, "All notifications marked as read", nil)
}

func (h *NotificationHandler) Delete(c fiber.Ctx) error {
	ctx := c.Context()

	idParam := c.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return BadRequestResponse(c, "INVALID_UUID", "Invalid notification ID format")
	}

	if err := h.service.Delete(ctx, id); err != nil {
		return InternalErrorResponse(c, "Failed to delete notification")
	}

	return NoContentResponse(c)
}
