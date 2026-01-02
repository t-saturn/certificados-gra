package app

import (
	"github.com/gofiber/fiber/v3"

	"server/internal/handler"
)

// DXHandlers groups all handlers for the DX (Document Exchange) module
type DXHandlers struct {
	Health           *handler.HealthHandler
	User             *handler.UserHandler
	UserDetail       *handler.UserDetailHandler
	DocumentType     *handler.DocumentTypeHandler
	DocumentCategory *handler.DocumentCategoryHandler
	DocumentTemplate *handler.DocumentTemplateHandler
	Document         *handler.DocumentHandler
	Event            *handler.EventHandler
	EventParticipant *handler.EventParticipantHandler
	Notification     *handler.NotificationHandler
	Evaluation       *handler.EvaluationHandler
	StudyMaterial    *handler.StudyMaterialHandler
}

// DXRouter handles DX (Document Exchange) related routes
type DXRouter struct {
	h *DXHandlers
}

// NewDXRouter creates a new DXRouter instance
func NewDXRouter(handlers *DXHandlers) *DXRouter {
	return &DXRouter{h: handlers}
}

// SetupHealthRoutes configures health check routes (public)
func (r *DXRouter) SetupHealthRoutes(app *fiber.App) {
	app.Get("/health", r.h.Health.Health)
	app.Get("/ready", r.h.Health.Ready)
}

// SetupRoutes configures all DX routes (protected)
func (r *DXRouter) SetupRoutes(api fiber.Router) {
	r.setupUserRoutes(api)
	r.setupUserDetailRoutes(api)
	r.setupDocumentTypeRoutes(api)
	r.setupDocumentCategoryRoutes(api)
	r.setupDocumentTemplateRoutes(api)
	r.setupDocumentRoutes(api)
	r.setupEventRoutes(api)
	r.setupEventParticipantRoutes(api)
	r.setupNotificationRoutes(api)
	r.setupEvaluationRoutes(api)
	r.setupStudyMaterialRoutes(api)
}

// setupUserRoutes configures user routes
func (r *DXRouter) setupUserRoutes(api fiber.Router) {
	g := api.Group("/users")
	g.Get("/", r.h.User.GetAll)
	g.Get("/:id", r.h.User.GetByID)
	g.Post("/", r.h.User.Create)
	g.Put("/:id", r.h.User.Update)
	g.Delete("/:id", r.h.User.Delete)
}

// setupUserDetailRoutes configures user detail routes (beneficiaries)
func (r *DXRouter) setupUserDetailRoutes(api fiber.Router) {
	g := api.Group("/user-details")
	g.Get("/", r.h.UserDetail.GetAll)
	g.Get("/:id", r.h.UserDetail.GetByID)
	g.Get("/dni/:nationalId", r.h.UserDetail.GetByNationalID)
	g.Post("/", r.h.UserDetail.Create)
	g.Put("/:id", r.h.UserDetail.Update)
	g.Delete("/:id", r.h.UserDetail.Delete)
}

// setupDocumentTypeRoutes configures document type routes
func (r *DXRouter) setupDocumentTypeRoutes(api fiber.Router) {
	g := api.Group("/document-types")
	g.Get("/", r.h.DocumentType.GetAll)
	g.Get("/active", r.h.DocumentType.GetActive)
	g.Get("/:id", r.h.DocumentType.GetByID)
	g.Get("/code/:code", r.h.DocumentType.GetByCode)
	g.Post("/", r.h.DocumentType.Create)
	g.Put("/:id", r.h.DocumentType.Update)
	g.Delete("/:id", r.h.DocumentType.Delete)
}

// setupDocumentCategoryRoutes configures document category routes
func (r *DXRouter) setupDocumentCategoryRoutes(api fiber.Router) {
	g := api.Group("/document-categories")
	g.Get("/", r.h.DocumentCategory.GetAll)
	g.Get("/:id", r.h.DocumentCategory.GetByID)
	g.Get("/document-type/:documentTypeId", r.h.DocumentCategory.GetByDocumentTypeID)
	g.Post("/", r.h.DocumentCategory.Create)
	g.Put("/:id", r.h.DocumentCategory.Update)
	g.Delete("/:id", r.h.DocumentCategory.Delete)
}

// setupDocumentTemplateRoutes configures document template routes
func (r *DXRouter) setupDocumentTemplateRoutes(api fiber.Router) {
	g := api.Group("/document-templates")
	g.Get("/", r.h.DocumentTemplate.GetAll)
	g.Get("/active", r.h.DocumentTemplate.GetActive)
	g.Get("/:id", r.h.DocumentTemplate.GetByID)
	g.Get("/document-type/:documentTypeId", r.h.DocumentTemplate.GetByDocumentTypeID)
	g.Post("/", r.h.DocumentTemplate.Create)
	g.Put("/:id", r.h.DocumentTemplate.Update)
	g.Delete("/:id", r.h.DocumentTemplate.Delete)
}

// setupDocumentRoutes configures document routes
func (r *DXRouter) setupDocumentRoutes(api fiber.Router) {
	g := api.Group("/documents")
	g.Get("/", r.h.Document.GetAll)
	g.Get("/:id", r.h.Document.GetByID)
	g.Get("/serial/:serialCode", r.h.Document.GetBySerialCode)
	g.Get("/verify/:verificationCode", r.h.Document.GetByVerificationCode)
	g.Get("/event/:eventId", r.h.Document.GetByEventID)
	g.Get("/user-detail/:userDetailId", r.h.Document.GetByUserDetailID)
	g.Post("/", r.h.Document.Create)
	g.Put("/:id", r.h.Document.Update)
	g.Delete("/:id", r.h.Document.Delete)
}

// setupEventRoutes configures event routes
func (r *DXRouter) setupEventRoutes(api fiber.Router) {
	g := api.Group("/events")
	g.Get("/", r.h.Event.GetAll)
	g.Get("/public", r.h.Event.GetPublic)
	g.Get("/status/:status", r.h.Event.GetByStatus)
	g.Get("/:id", r.h.Event.GetByID)
	g.Get("/code/:code", r.h.Event.GetByCode)
	g.Post("/", r.h.Event.Create)
	g.Put("/:id", r.h.Event.Update)
	g.Delete("/:id", r.h.Event.Delete)
}

// setupEventParticipantRoutes configures event participant routes
func (r *DXRouter) setupEventParticipantRoutes(api fiber.Router) {
	g := api.Group("/event-participants")
	g.Get("/:id", r.h.EventParticipant.GetByID)
	g.Get("/event/:eventId", r.h.EventParticipant.GetByEventID)
	g.Get("/event/:eventId/count", r.h.EventParticipant.CountByEventID)
	g.Get("/user-detail/:userDetailId", r.h.EventParticipant.GetByUserDetailID)
	g.Post("/", r.h.EventParticipant.Create)
	g.Put("/:id", r.h.EventParticipant.Update)
	g.Delete("/:id", r.h.EventParticipant.Delete)
}

// setupNotificationRoutes configures notification routes
func (r *DXRouter) setupNotificationRoutes(api fiber.Router) {
	g := api.Group("/notifications")
	g.Get("/:id", r.h.Notification.GetByID)
	g.Get("/user/:userId", r.h.Notification.GetByUserID)
	g.Get("/user/:userId/unread", r.h.Notification.GetUnreadByUserID)
	g.Get("/user/:userId/unread/count", r.h.Notification.CountUnreadByUserID)
	g.Post("/", r.h.Notification.Create)
	g.Patch("/:id/read", r.h.Notification.MarkAsRead)
	g.Patch("/user/:userId/read-all", r.h.Notification.MarkAllAsRead)
	g.Delete("/:id", r.h.Notification.Delete)
}

// setupEvaluationRoutes configures evaluation routes
func (r *DXRouter) setupEvaluationRoutes(api fiber.Router) {
	g := api.Group("/evaluations")
	g.Get("/", r.h.Evaluation.GetAll)
	g.Get("/:id", r.h.Evaluation.GetByID)
	g.Get("/user/:userId", r.h.Evaluation.GetByUserID)
	g.Post("/", r.h.Evaluation.Create)
	g.Put("/:id", r.h.Evaluation.Update)
	g.Delete("/:id", r.h.Evaluation.Delete)
}

// setupStudyMaterialRoutes configures study material routes
func (r *DXRouter) setupStudyMaterialRoutes(api fiber.Router) {
	g := api.Group("/study-materials")
	g.Get("/", r.h.StudyMaterial.GetAll)
	g.Get("/:id", r.h.StudyMaterial.GetByID)
	g.Post("/", r.h.StudyMaterial.Create)
	g.Put("/:id", r.h.StudyMaterial.Update)
	g.Delete("/:id", r.h.StudyMaterial.Delete)
}