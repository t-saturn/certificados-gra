package app

import (
	"context"

	"github.com/gofiber/fiber/v3"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"

	"server/internal/handler"
	"server/internal/repository"
	"server/internal/service"
	"server/internal/worker"
)

type App struct {
	db        *gorm.DB
	redis     *redis.Client
	nats      *nats.Conn
	fiber     *fiber.App
	pdfWorker *worker.FNPDFWorker
}

type Config struct {
	DB    *gorm.DB
	Redis *redis.Client
	NATS  *nats.Conn
}

func New(cfg Config) *App {
	app := &App{
		db:    cfg.DB,
		redis: cfg.Redis,
		nats:  cfg.NATS,
	}

	app.initRouter()
	app.initWorkers()

	return app
}

func (a *App) initRouter() {
	router := NewRouter(RouterConfig{
		DX: a.buildDXHandlers(),
		FN: a.buildFNHandlers(),
	})
	a.fiber = router.Setup()
}

func (a *App) initWorkers() {
	// build fn services for workers
	fnDocRepo := repository.NewFNDocumentRepository(a.db)
	fnDocPDFRepo := repository.NewFNDocumentPDFRepository(a.db)
	fnEventRepo := repository.NewFNEventRepository(a.db)
	fnUserDetailRepo := repository.NewFNUserDetailRepository(a.db)

	fnDocActionSvc := service.NewFNDocumentActionService(
		fnDocRepo,
		fnDocPDFRepo,
		fnEventRepo,
		fnUserDetailRepo,
		a.nats,
	)

	// create and store pdf worker
	a.pdfWorker = worker.NewFNPDFWorker(a.nats, fnDocActionSvc)
}

func (a *App) StartWorkers(ctx context.Context) error {
	if a.pdfWorker != nil {
		if err := a.pdfWorker.Start(ctx); err != nil {
			log.Error().Err(err).Msg("failed to start PDF worker")
			return err
		}
		log.Info().Msg("PDF worker started successfully")
	}
	return nil
}

func (a *App) buildDXHandlers() *DXHandlers {
	// dx repositories
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

	// dx services
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

func (a *App) buildFNHandlers() *FNHandlers {
	// fn repositories
	fnDocTemplateRepo := repository.NewFNDocumentTemplateRepository(a.db)
	fnEventRepo := repository.NewFNEventRepository(a.db)
	fnUserDetailRepo := repository.NewFNUserDetailRepository(a.db)
	fnDocRepo := repository.NewFNDocumentRepository(a.db)
	fnDocPDFRepo := repository.NewFNDocumentPDFRepository(a.db)

	// fn services
	fnDocTemplateSvc := service.NewFNDocumentTemplateService(fnDocTemplateRepo)
	fnEventSvc := service.NewFNEventService(fnEventRepo, fnUserDetailRepo)
	fnDocActionSvc := service.NewFNDocumentActionService(
		fnDocRepo,
		fnDocPDFRepo,
		fnEventRepo,
		fnUserDetailRepo,
		a.nats,
	)

	return &FNHandlers{
		DocumentTemplate: handler.NewFNDocumentTemplateHandler(fnDocTemplateSvc),
		Event:            handler.NewFNEventHandler(fnEventSvc),
		DocumentAction:   handler.NewFNDocumentActionHandler(fnDocActionSvc),
	}
}

func (a *App) Fiber() *fiber.App {
	return a.fiber
}

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