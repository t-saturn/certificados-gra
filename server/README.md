# Cert Server

API REST con Fiber para gestión de certificados.

## Stack Tecnológico

- **Framework HTTP**: Fiber v2
- **ORM**: GORM con PostgreSQL
- **Cache**: Redis (opcional)
- **Mensajería**: NATS (opcional, para eventos futuros)
- **Logging**: Zerolog
- **Configuración**: Viper

## Estructura del Proyecto

```
server/
├── cmd/
│   ├── server/         # Entry point principal
│   ├── migrate/        # Herramienta de migraciones
│   └── seed/           # Herramienta de seeding
├── internal/
│   ├── config/         # Configuración y conexiones
│   ├── domain/models/  # Modelos GORM
│   ├── repository/     # Capa de repositorio
│   ├── service/        # Lógica de negocio
│   ├── handler/        # Handlers HTTP (Fiber)
│   ├── middleware/     # Middleware personalizado
│   └── router/         # Configuración de rutas
├── pkg/shared/logger/  # Logger compartido
├── seeds/              # Archivos YAML de seeds
├── docker-compose.yml  # Servicios Docker
├── Dockerfile          # Build multi-stage
└── Makefile            # Comandos de desarrollo
```

## API Endpoints

```
GET    /health                    # Health check
GET    /ready                     # Readiness con servicios

GET    /api/v1/users              # Listar usuarios
GET    /api/v1/users/:id          # Obtener usuario
POST   /api/v1/users              # Crear usuario
PUT    /api/v1/users/:id          # Actualizar usuario
DELETE /api/v1/users/:id          # Eliminar usuario

GET    /api/v1/document-types           # Listar tipos
GET    /api/v1/document-types/active    # Solo activos
GET    /api/v1/document-types/code/:code
GET    /api/v1/document-types/:id
POST   /api/v1/document-types
PUT    /api/v1/document-types/:id
DELETE /api/v1/document-types/:id
```

## Inicio Rápido

### Con Docker Compose

```bash
# Levantar todos los servicios (postgres, redis, nats, server)
docker-compose up -d

# Ver logs
docker-compose logs -f server
```

### Desarrollo Local

```bash
# Instalar dependencias
make tidy

# Levantar solo infraestructura
docker-compose up -d postgres redis nats

# Ejecutar migraciones
make migrate-up

# Ejecutar seeds
make seed

# Iniciar servidor con hot reload
make dev
```

## Comandos Make

```bash
make help           # Mostrar ayuda
make build          # Compilar binario
make run            # Ejecutar servidor
make dev            # Desarrollo con air (hot reload)
make test           # Ejecutar tests
make lint           # Ejecutar linter
make fmt            # Formatear código

make migrate-up     # Aplicar migraciones
make migrate-down   # Revertir migraciones
make migrate-reset  # Reset completo
make seed           # Poblar datos iniciales

make docker-build   # Build imagen Docker
make docker-run     # Ejecutar contenedor
make docker-compose-up    # docker-compose up
make docker-compose-down  # docker-compose down

make init           # Setup completo (deps + migrate + seed)
```

## Variables de Entorno

```env
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
SERVER_ENVIRONMENT=development
SERVER_VERSION=1.0.0

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=101010
DB_NAME=cert_gra
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# NATS
NATS_URL=nats://localhost:4222
NATS_NAME=cert-server
```

## Arquitectura

```
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Fiber     │
└─────────────┘     │  (Router)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Handlers   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Services   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Repository │
                    │ (PostgreSQL)│
                    └─────────────┘
```

## Licencia

MIT
