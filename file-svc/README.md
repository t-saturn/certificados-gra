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
├── tests/
│   ├── integration_upload_test.rs    # Tests de upload
│   ├── integration_download_test.rs  # Tests de download
│   └── integration_events_test.rs    # Tests de eventos NATS
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

# Iniciar dependencias (Redis + NATS)
make docker-deps

# Desarrollo con hot reload
make dev

# O ejecutar directamente
make run
```

## API Endpoints

| Método | Ruta                    | Descripción                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/health`               | Health check básico           |
| GET    | `/health?db=true`       | Health check con estado de BD |
| GET    | `/health?full=true`     | Health check completo         |
| POST   | `/upload`               | Subir archivo (multipart)     |
| GET    | `/download?file_id=xxx` | Descargar archivo             |

### Upload (Multipart Form)

> **Nota:** `project_id` se obtiene de la variable de entorno `FILE_PROJECT_ID`, no se envía en el request.

```bash
curl -X POST http://localhost:8080/upload \
  -F "user_id=584211ff-6e2a-4e59-a3bf-6738535ab5e0" \
  -F "is_public=true" \
  -F "file=@./document.pdf"
```

**Parámetros:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `user_id` | UUID | ✅ | ID del usuario |
| `is_public` | boolean | ❌ | Si el archivo es público (default: true) |
| `file` | file | ✅ | Archivo a subir |

**Respuesta exitosa (200):**

```json
{
  "status": "success",
  "message": "Archivo subido correctamente",
  "data": {
    "id": "b323980f-dd3d-4839-b7c0-7183319ae750",
    "original_name": "document.pdf",
    "size": 291256,
    "mime_type": "application/pdf",
    "is_public": true,
    "created_at": "2025-12-28T17:09:23.944981Z"
  }
}
```

### Download

```bash
curl -O "http://localhost:8080/download?file_id=b323980f-dd3d-4839-b7c0-7183319ae750"
```

**Parámetros Query:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file_id` | UUID | ✅ | ID del archivo a descargar |

**Respuesta exitosa:** Archivo binario con headers:

- `Content-Type`: MIME type del archivo
- `Content-Disposition`: `attachment; filename="nombre.ext"`
- `Content-Length`: Tamaño en bytes

## Eventos NATS

| Subject                    | Descripción                         |
| -------------------------- | ----------------------------------- |
| `files.upload.requested`   | Upload iniciado                     |
| `files.upload.completed`   | Upload completado (incluye file_id) |
| `files.upload.failed`      | Upload fallido (incluye error)      |
| `files.download.requested` | Download iniciado                   |
| `files.download.completed` | Download completado                 |
| `files.download.failed`    | Download fallido                    |

### Estructura de Evento

```json
{
  "event_id": "uuid",
  "event_type": "files.upload.completed",
  "timestamp": "2025-12-28T17:09:23.944981Z",
  "source": "file-svc",
  "payload": {
    "job_id": "uuid",
    "file_id": "uuid",
    "project_id": "uuid",
    "user_id": "uuid",
    "file_name": "documento.pdf",
    "file_size": 12345,
    "mime_type": "application/pdf",
    "is_public": true,
    "download_url": "https://..."
  }
}
```

### Monitorear Eventos

```bash
# Instalar NATS CLI: https://github.com/nats-io/natscli

# Todos los eventos
nats sub 'files.>'

# Solo eventos de upload
nats sub 'files.upload.*'

# Solo errores
nats sub 'files.*.failed'
```

## Comandos Make

```bash
make help              # Ver todos los comandos

# Desarrollo
make setup             # Configurar proyecto
make dev               # Desarrollo con hot reload
make run               # Ejecutar
make build             # Compilar debug
make release           # Compilar release

# Código
make fmt               # Formatear código
make lint              # Ejecutar clippy
make check             # Verificar código

# Tests
make test              # Tests unitarios
make test-compile      # Compilar tests (para Windows)
make test-upload       # Tests de upload
make test-download     # Tests de download
make test-events       # Tests de eventos NATS
make test-integration  # Todos los tests de integración

# Docker
make docker-build      # Construir imagen
make docker-run        # Ejecutar contenedor
make docker-deps       # Iniciar Redis + NATS
make docker-deps-stop  # Detener Redis + NATS
make docker-deps-status # Ver estado de dependencias

# Limpieza
make clean             # Limpiar artifacts
```

## Tests de Integración

### Requisitos

```bash
# 1. Iniciar dependencias
make docker-deps

# 2. Verificar que estén corriendo
make docker-deps-status
```

### Ejecutar Tests

**Linux/Mac:**

```bash
# Terminal 1: Iniciar servicio
make run

# Terminal 2: Ejecutar tests
make test-upload       # Tests de upload
make test-download     # Tests de download
make test-events       # Tests de eventos
make test-integration  # Todos
```

**Windows (workaround para file locking):**

```powershell
# 1. Compilar tests (con servicio DETENIDO)
cargo test --no-run

# 2. Iniciar servicio
.\target\debug\file-svc.exe

# 3. En otra terminal, ejecutar tests pre-compilados
.\target\debug\deps\integration_upload_test-*.exe --nocapture --test-threads=1
.\target\debug\deps\integration_download_test-*.exe --nocapture --test-threads=1
.\target\debug\deps\integration_events_test-*.exe --nocapture --test-threads=1
```

### Tests Disponibles

**Upload Tests (`integration_upload_test.rs`):**

- ✅ Upload exitoso de archivo de texto
- ✅ Upload exitoso de archivo PDF
- ✅ Upload exitoso de imagen PNG
- ❌ Error 400: falta user_id
- ❌ Error 400: falta archivo
- ❌ Error 400: archivo vacío
- ⏱️ Upload de archivos grandes (100KB)
- 💚 Health check completo

**Download Tests (`integration_download_test.rs`):**

- ✅ Flujo completo: Upload → Download → Verificar contenido
- ✅ Download de PDF con verificación de headers
- ❌ Error con file_id inválido (no es UUID)
- ❌ Error 404: archivo inexistente
- ❌ Error: falta parámetro file_id
- 📊 Download de múltiples archivos
- ⏱️ Medición de rendimiento

**Events Tests (`integration_events_test.rs`):**

- 🔔 Captura de eventos durante upload exitoso
- 🔔 Verificar que no hay eventos en error de validación
- 📋 Documentación de eventos disponibles
- 🔌 Test de conectividad NATS
- 👀 Monitor de eventos en tiempo real
- ✅ Verificación de estructura de eventos

## Docker

```bash
# Construir imagen
make docker-build

# Ejecutar contenedor
make docker-run

# Iniciar dependencias
make docker-deps

# Detener dependencias
make docker-deps-stop
```

## Variables de Entorno

```bash
# Server
PORT=8080
ENVIRONMENT=development

# File Server (externo)
FILE_BASE_URL=https://files.example.com
FILE_PUBLIC_URL=https://files.example.com/public
FILE_API_URL=https://files.example.com/api/v1
FILE_ACCESS_KEY=your-access-key
FILE_SECRET_KEY=your-secret-key
FILE_PROJECT_ID=your-project-id

# Redis
REDIS_URL=redis://:supersecret@localhost:6379

# NATS
NATS_URL=nats://localhost:4222
```

Ver `.env.example` para todas las variables disponibles.

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  file-svc   │────▶│ File Server │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              ┌─────────┐ ┌─────────┐
              │  Redis  │ │  NATS   │
              │ (cache) │ │(events) │
              └─────────┘ └─────────┘
```

- **Repository Pattern**: Abstracción de acceso a datos
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **Event-Driven**: Comunicación asíncrona via NATS
- **Dependency Injection**: Via traits y generics

## Errores Comunes

| Código                   | Error | Descripción                         |
| ------------------------ | ----- | ----------------------------------- |
| `MISSING_PARAMS`         | 400   | Falta parámetro requerido (user_id) |
| `MISSING_FILE`           | 400   | No se envió archivo o está vacío    |
| `INVALID_UUID`           | 400   | El file_id no es un UUID válido     |
| `NOT_FOUND`              | 404   | Archivo no encontrado               |
| `EXTERNAL_SERVICE_ERROR` | 502   | Error en el file server externo     |
