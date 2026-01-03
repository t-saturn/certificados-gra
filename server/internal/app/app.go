package app

import (
	"github.com/gofiber/fiber/v3"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"server/internal/handler"
	"server/internal/repository"
	"server/internal/service"
)

// App holds all application dependencies
type App struct {
	db    *gorm.DB
	redis *redis.Client
	nats  *nats.Conn
	fiber *fiber.App
}

// Config holds the connection dependencies
type Config struct {
	DB    *gorm.DB
	Redis *redis.Client
	NATS  *nats.Conn
}

// New creates a new App instance with all dependencies initialized
func New(cfg Config) *App {
	app := &App{
		db:    cfg.DB,
		redis: cfg.Redis,
		nats:  cfg.NATS,
	}

	app.initRouter()
	return app
}

// initRouter initializes the Fiber router with all dependencies
func (a *App) initRouter() {
	router := NewRouter(RouterConfig{
		DX: a.buildDXHandlers(),
		FN: a.buildFNHandlers(),
	})
	a.fiber = router.Setup()
}

// buildDXHandlers creates all DX module handlers with their dependencies
func (a *App) buildDXHandlers() *DXHandlers {
	// Repositories
	userRepo := repository.NewUserRepository(a.db)
	userDetailRepo := repository.NewUserDetailRepository(a.db)
	docTypeRepo := repository.NewDocumentTypeRepository(a.db)
	docCategoryRepo := repository.NewDocumentCategoryRepository(a.db)
	docTemplateRepo := repository.NewDocumentTemplateRepository(a.db)
	documentRepo := repository.NewDocumentRepository(a.db)
	eventRepo := repository.NewEventRepository(a.db)
	eventParticipantRepo := repository.NewEventParticipantRepository(a.db)
	notificationRepo := repository.NewNotificationRepository(a.db)
	evaluationRepo := repository.NewEvaluationRepository(a.db)
	studyMaterialRepo := repository.NewStudyMaterialRepository(a.db)

	// Services
	userSvc := service.NewUserService(userRepo)
	userDetailSvc := service.NewUserDetailService(userDetailRepo)
	docTypeSvc := service.NewDocumentTypeService(docTypeRepo)
	docCategorySvc := service.NewDocumentCategoryService(docCategoryRepo)
	docTemplateSvc := service.NewDocumentTemplateService(docTemplateRepo)
	documentSvc := service.NewDocumentService(documentRepo)
	eventSvc := service.NewEventService(eventRepo)
	eventParticipantSvc := service.NewEventParticipantService(eventParticipantRepo)
	notificationSvc := service.NewNotificationService(notificationRepo)
	evaluationSvc := service.NewEvaluationService(evaluationRepo)
	studyMaterialSvc := service.NewStudyMaterialService(studyMaterialRepo)

	// Return handlers
	return &DXHandlers{
		Health:           handler.NewHealthHandler(a.db, a.redis, a.nats),
		User:             handler.NewUserHandler(userSvc),
		UserDetail:       handler.NewUserDetailHandler(userDetailSvc),
		DocumentType:     handler.NewDocumentTypeHandler(docTypeSvc),
		DocumentCategory: handler.NewDocumentCategoryHandler(docCategorySvc),
		DocumentTemplate: handler.NewDocumentTemplateHandler(docTemplateSvc),
		Document:         handler.NewDocumentHandler(documentSvc),
		Event:            handler.NewEventHandler(eventSvc),
		EventParticipant: handler.NewEventParticipantHandler(eventParticipantSvc),
		Notification:     handler.NewNotificationHandler(notificationSvc),
		Evaluation:       handler.NewEvaluationHandler(evaluationSvc),
		StudyMaterial:    handler.NewStudyMaterialHandler(studyMaterialSvc),
	}
}

// buildFNHandlers creates all FN module handlers with their dependencies
func (a *App) buildFNHandlers() *FNHandlers {
	// Repositories (FN uses enriched repositories with nested data)
	fnDocTemplateRepo := repository.NewFNDocumentTemplateRepository(a.db)

	// Services
	fnDocTemplateSvc := service.NewFNDocumentTemplateService(fnDocTemplateRepo)

	// Return handlers
	return &FNHandlers{
		DocumentTemplate: handler.NewFNDocumentTemplateHandler(fnDocTemplateSvc),
	}
}

// Fiber returns the Fiber app instance
func (a *App) Fiber() *fiber.App {
	return a.fiber
}

// Shutdown gracefully shuts down all connections
func (a *App) Shutdown() error {
	if a.fiber != nil {
		if err := a.fiber.Shutdown(); err != nil {
			return err
		}
	}

	if a.nats != nil {
		a.nats.Close()
	}

	if a.redis != nil {
		_ = a.redis.Close()
	}

	if a.db != nil {
		if sqlDB, err := a.db.DB(); err == nil && sqlDB != nil {
			_ = sqlDB.Close()
		}
	}

	return nil
}