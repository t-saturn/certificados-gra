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

	// Repositories
	userRepo       repository.UserRepository
	userDetailRepo repository.UserDetailRepository
	docTypeRepo    repository.DocumentTypeRepository
	eventRepo      repository.EventRepository

	// Services
	userService       *service.UserService
	userDetailService *service.UserDetailService
	docTypeService    *service.DocumentTypeService
	eventService      *service.EventService

	// Handlers
	healthHandler     *handler.HealthHandler
	userHandler       *handler.UserHandler
	userDetailHandler *handler.UserDetailHandler
	docTypeHandler    *handler.DocumentTypeHandler
	eventHandler      *handler.EventHandler

	// Fiber app
	fiber *fiber.App
}

// Config holds the connection dependencies
type Config struct {
	DB    *gorm.DB
	Redis *redis.Client // Can be nil if Redis is not available
	NATS  *nats.Conn    // Can be nil if NATS is not available
}

// New creates a new App instance with all dependencies initialized
func New(cfg Config) *App {
	app := &App{
		db:    cfg.DB,
		redis: cfg.Redis,
		nats:  cfg.NATS,
	}

	app.initRepositories()
	app.initServices()
	app.initHandlers()
	app.initRouter()

	return app
}

// initRepositories initializes all repositories
func (a *App) initRepositories() {
	a.userRepo = repository.NewUserRepository(a.db)
	a.userDetailRepo = repository.NewUserDetailRepository(a.db)
	a.docTypeRepo = repository.NewDocumentTypeRepository(a.db)
	a.eventRepo = repository.NewEventRepository(a.db)
}

// initServices initializes all services
func (a *App) initServices() {
	a.userService = service.NewUserService(a.userRepo)
	a.userDetailService = service.NewUserDetailService(a.userDetailRepo)
	a.docTypeService = service.NewDocumentTypeService(a.docTypeRepo)
	a.eventService = service.NewEventService(a.eventRepo)
}

// initHandlers initializes all handlers
func (a *App) initHandlers() {
	a.healthHandler = handler.NewHealthHandler(a.db, a.redis, a.nats)
	a.userHandler = handler.NewUserHandler(a.userService)
	a.userDetailHandler = handler.NewUserDetailHandler(a.userDetailService)
	a.docTypeHandler = handler.NewDocumentTypeHandler(a.docTypeService)
	a.eventHandler = handler.NewEventHandler(a.eventService)
}

// initRouter initializes the Fiber router
func (a *App) initRouter() {
	router := NewRouter(RouterConfig{
		HealthHandler:       a.healthHandler,
		UserHandler:         a.userHandler,
		UserDetailHandler:   a.userDetailHandler,
		DocumentTypeHandler: a.docTypeHandler,
		EventHandler:        a.eventHandler,
	})
	a.fiber = router.Setup()
}

// Fiber returns the Fiber app instance
func (a *App) Fiber() *fiber.App {
	return a.fiber
}

// Shutdown gracefully shuts down all connections
func (a *App) Shutdown() error {
	// Shutdown Fiber
	if a.fiber != nil {
		if err := a.fiber.Shutdown(); err != nil {
			return err
		}
	}

	// Close NATS
	if a.nats != nil {
		a.nats.Close()
	}

	// Close Redis
	if a.redis != nil {
		_ = a.redis.Close()
	}

	// Close PostgreSQL
	if a.db != nil {
		sqlDB, _ := a.db.DB()
		if sqlDB != nil {
			_ = sqlDB.Close()
		}
	}

	return nil
}