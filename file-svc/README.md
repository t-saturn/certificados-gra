# file-svc

Microservicio de gateway para gestión de archivos con REST API y eventos NATS.

## Estructura

```
file-svc/
├── src/
│   ├── main.rs                 # Entry point
│   ├── lib.rs                  # Re-exports
│   ├── config/                 # Configuración
│   ├── models/                 # Entidades/Modelos
│   ├── dto/                    # Data Transfer Objects
│   ├── events/                 # Eventos NATS
│   ├── repositories/           # Data Access
│   ├── services/               # Lógica de negocio
│   ├── handlers/               # HTTP Handlers
│   ├── workers/                # Event Workers
│   ├── middleware/             # Middleware
│   ├── shared/                 # Utilidades
│   ├── router.rs               # Router setup
│   ├── state.rs                # AppState
│   └── error.rs                # Error handling
├── config/
│   ├── default.toml
│   └── production.toml
├── Cargo.toml
├── Makefile
├── Dockerfile
└── .env.example
```

## Inicio Rápido

```bash
# Setup inicial
make setup

# Desarrollo con hot reload
make dev

# O ejecutar directamente
make run
```

## API Endpoints

| Método | Ruta                | Descripción                   |
| ------ | ------------------- | ----------------------------- |
| GET    | `/health`           | Health check básico           |
| GET    | `/health?db=true`   | Health check con estado de BD |
| GET    | `/health?full=true` | Health check completo         |
| POST   | `/upload`           | Subir archivo (multipart)     |
| GET    | `/download/:id`     | Descargar archivo             |

### Upload (Multipart Form)

```bash
curl -X POST http://localhost:8080/upload \
  -F "project_id=my-project" \
  -F "user_id=user123" \
  -F "is_public=true" \
  -F "file=@./document.pdf"
```

### Download

```bash
curl -O http://localhost:8080/download/550e8400-e29b-41d4-a716-446655440000
```

## Eventos NATS

| Subject                    | Descripción         |
| -------------------------- | ------------------- |
| `files.upload.requested`   | Upload iniciado     |
| `files.upload.completed`   | Upload completado   |
| `files.upload.failed`      | Upload fallido      |
| `files.download.requested` | Download iniciado   |
| `files.download.completed` | Download completado |
| `files.download.failed`    | Download fallido    |

## Comandos Make

```bash
make help      # Ver todos los comandos
make setup     # Configurar proyecto
make dev       # Desarrollo con hot reload
make run       # Ejecutar
make build     # Compilar debug
make release   # Compilar release
make fmt       # Formatear código
make lint      # Ejecutar clippy
make test      # Ejecutar tests
make clean     # Limpiar artifacts
```

## Docker

```bash
# Construir imagen
make docker-build

# Ejecutar contenedor
make docker-run
```

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles.

## Arquitectura

- **Repository Pattern**: Abstracción de acceso a datos
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **Event-Driven**: Comunicación asíncrona via NATS
- **Dependency Injection**: Via traits y generics
