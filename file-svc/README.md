# file-svc

Microservicio de gateway para gestión de archivos con REST API y eventos NATS.

## Estructura

```

file-svc/
├── src/
│ ├── main.rs # Entry point
│ ├── lib.rs # Re-exports
│ ├── config/ # Configuración
│ ├── models/ # Entidades/Modelos
│ ├── dto/ # Data Transfer Objects
│ ├── events/ # Eventos NATS
│ ├── repositories/ # Data Access
│ ├── services/ # Lógica de negocio
│ ├── handlers/ # HTTP Handlers
│ ├── workers/ # Event Workers
│ ├── middleware/ # Middleware
│ ├── shared/ # Utilidades
│ ├── router.rs # Router setup
│ ├── state.rs # AppState
│ └── error.rs # Error handling
├── tests/
│ ├── integration_upload_test.rs # Tests de upload
│ ├── integration_download_test.rs # Tests de download
│ └── integration_events_test.rs # Tests de eventos NATS
├── config/
│ ├── default.toml
│ └── production.toml
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

---

## API REST

### Endpoints

| Método | Ruta                    | Descripción                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/health`               | Health check básico           |
| GET    | `/health?db=true`       | Health check con estado de BD |
| GET    | `/health?full=true`     | Health check completo         |
| POST   | `/upload`               | Subir archivo (multipart)     |
| GET    | `/download?file_id=xxx` | Descargar archivo             |

### Upload (POST /upload)

> **Nota:** `project_id` se obtiene de la variable de entorno `FILE_PROJECT_ID`, no se envía en el request.

```bash
curl -X POST http://localhost:8080/upload \
  -F "user_id=584211ff-6e2a-4e59-a3bf-6738535ab5e0" \
  -F "is_public=true" \
  -F "file=@./document.pdf"
```

**Parámetros:**

| Campo       | Tipo    | Requerido | Descripción                              |
| ----------- | ------- | --------- | ---------------------------------------- |
| `user_id`   | UUID    | ✅        | ID del usuario                           |
| `is_public` | boolean | ❌        | Si el archivo es público (default: true) |
| `file`      | file    | ✅        | Archivo a subir                          |

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

### Download (GET /download)

```bash
curl -O "http://localhost:8080/download?file_id=b323980f-dd3d-4839-b7c0-7183319ae750"
```

**Parámetros Query:**

| Campo     | Tipo | Requerido | Descripción                |
| --------- | ---- | --------- | -------------------------- |
| `file_id` | UUID | ✅        | ID del archivo a descargar |

**Respuesta exitosa:** Archivo binario con headers:

- `Content-Type`: MIME type del archivo
- `Content-Disposition`: `attachment; filename="nombre.ext"`
- `Content-Length`: Tamaño en bytes

---

## Eventos NATS

### Resumen de Subjects

| Subject                    | Emisor   | Descripción                                     |
| -------------------------- | -------- | ----------------------------------------------- |
| `files.upload.requested`   | file-svc | Upload iniciado (interno)                       |
| `files.upload.completed`   | file-svc | Upload completado exitosamente                  |
| `files.upload.failed`      | file-svc | Upload falló                                    |
| `files.download.requested` | cliente  | Solicitud de descarga (desde otro servicio)     |
| `files.download.completed` | file-svc | Descarga completada (incluye archivo en base64) |
| `files.download.failed`    | file-svc | Descarga falló                                  |

### Estructura Base de Eventos

Todos los eventos siguen esta estructura envolvente:

```json
{
  "event_id": "uuid",
  "event_type": "files.upload.completed",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": { ... }
}
```

---

## Eventos de Upload

### `files.upload.requested`

Emitido cuando inicia el proceso de upload.

```json
{
  "event_id": "1be20d97-4d63-499f-ad14-475299d6158c",
  "event_type": "files.upload.requested",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": {
    "job_id": "86aff39c-5f34-4c98-87a5-e82a9d4b2237",
    "project_id": "f13fe72f-d50c-4824-9f8c-b073a7f93aaf",
    "user_id": "584211ff-6e2a-4e59-a3bf-6738535ab5e0",
    "file_name": "documento.pdf",
    "file_size": 291256,
    "mime_type": "application/pdf",
    "is_public": true
  }
}
```

### `files.upload.completed`

Emitido cuando el upload se completa exitosamente.

```json
{
  "event_id": "cab17122-03e0-4b5f-b27c-cbfe21d66dec",
  "event_type": "files.upload.completed",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": {
    "job_id": "86aff39c-5f34-4c98-87a5-e82a9d4b2237",
    "file_id": "9bfa36a4-768c-4fd8-9031-727ce44bc013",
    "project_id": "f13fe72f-d50c-4824-9f8c-b073a7f93aaf",
    "user_id": "584211ff-6e2a-4e59-a3bf-6738535ab5e0",
    "file_name": "documento.pdf",
    "file_size": 291256,
    "mime_type": "application/pdf",
    "is_public": true,
    "download_url": "https://files-demo.example.com/public/files/9bfa36a4-768c-4fd8-9031-727ce44bc013"
  }
}
```

### `files.upload.failed`

Emitido cuando el upload falla.

```json
{
  "event_id": "abc12345-1234-5678-9abc-def012345678",
  "event_type": "files.upload.failed",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": {
    "job_id": "86aff39c-5f34-4c98-87a5-e82a9d4b2237",
    "project_id": "f13fe72f-d50c-4824-9f8c-b073a7f93aaf",
    "user_id": "584211ff-6e2a-4e59-a3bf-6738535ab5e0",
    "file_name": "documento.pdf",
    "error_code": "UPLOAD_FAILED",
    "error_message": "External service error: Connection timeout"
  }
}
```

---

## Eventos de Download

### `files.download.requested`

**Enviado por el cliente** (ej: pdf-svc) para solicitar la descarga de un archivo.

> **Nota:** No requiere `project_id` - file-svc usa su propio config.

```json
{
  "event_id": "b0d33b36-e699-48ee-8bf0-d32a06599354",
  "event_type": "files.download.requested",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "pdf-svc",
  "payload": {
    "job_id": "640ea27b-44e8-4da5-90fa-3a2cdb38392a",
    "file_id": "8748db65-9d84-4fdf-b47f-938cfa96366b",
    "user_id": "35329d08-161a-4f22-98eb-77eca63cdc5a"
  }
}
```

**Campos del payload:**

| Campo     | Tipo   | Requerido | Descripción                         |
| --------- | ------ | --------- | ----------------------------------- |
| `job_id`  | UUID   | ✅        | ID único del job (para correlación) |
| `file_id` | UUID   | ✅        | ID del archivo a descargar          |
| `user_id` | String | ✅        | ID del usuario solicitante          |

### `files.download.completed`

**Emitido por file-svc** como respuesta exitosa, incluye el archivo en base64.

```json
{
  "event_id": "7d55570f-d673-4a15-a790-610d46b02077",
  "event_type": "files.download.completed",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": {
    "job_id": "640ea27b-44e8-4da5-90fa-3a2cdb38392a",
    "file_id": "8748db65-9d84-4fdf-b47f-938cfa96366b",
    "project_id": "f13fe72f-d50c-4824-9f8c-b073a7f93aaf",
    "user_id": "35329d08-161a-4f22-98eb-77eca63cdc5a",
    "file_name": "template.pdf",
    "file_size": 291256,
    "mime_type": "application/pdf",
    "download_url": "https://files-demo.example.com/public/files/8748db65-9d84-4fdf-b47f-938cfa96366b",
    "content_base64": "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoK..."
  }
}
```

**Campos del payload:**

| Campo            | Tipo   | Descripción                                |
| ---------------- | ------ | ------------------------------------------ |
| `job_id`         | UUID   | ID del job (mismo que el request)          |
| `file_id`        | UUID   | ID del archivo                             |
| `project_id`     | String | ID del proyecto (desde config de file-svc) |
| `user_id`        | String | ID del usuario                             |
| `file_name`      | String | Nombre original del archivo                |
| `file_size`      | u64    | Tamaño en bytes                            |
| `mime_type`      | String | Tipo MIME del archivo                      |
| `download_url`   | String | URL pública para descarga directa          |
| `content_base64` | String | **Contenido del archivo en Base64**        |

### `files.download.failed`

**Emitido por file-svc** cuando la descarga falla.

```json
{
  "event_id": "error-uuid-here",
  "event_type": "files.download.failed",
  "timestamp": "2025-12-29T12:00:00.000000Z",
  "source": "file-svc",
  "payload": {
    "job_id": "640ea27b-44e8-4da5-90fa-3a2cdb38392a",
    "file_id": "8748db65-9d84-4fdf-b47f-938cfa96366b",
    "project_id": "f13fe72f-d50c-4824-9f8c-b073a7f93aaf",
    "user_id": "35329d08-161a-4f22-98eb-77eca63cdc5a",
    "error_code": "DOWNLOAD_FAILED",
    "error_message": "File not found"
  }
}
```

**Códigos de error posibles:**

| error_code        | Descripción               |
| ----------------- | ------------------------- |
| `DOWNLOAD_FAILED` | Error general de descarga |
| `NOT_FOUND`       | Archivo no encontrado     |
| `TIMEOUT`         | Timeout en el file server |
| `INVALID_UUID`    | UUID de archivo inválido  |

---

## Flujo de Comunicación por Eventos

### Diagrama de Secuencia

```
┌─────────────┐                      ┌─────────────┐                      ┌─────────────┐
│   pdf-svc   │                      │  file-svc   │                      │ file-server │
└──────┬──────┘                      └──────┬──────┘                      └──────┬──────┘
       │                                    │                                    │
       │  files.download.requested          │                                    │
       │  {job_id, file_id, user_id}        │                                    │
       │ ──────────────────────────────────►│                                    │
       │                                    │                                    │
       │                                    │  GET /public/files/{file_id}       │
       │                                    │ ──────────────────────────────────►│
       │                                    │                                    │
       │                                    │◄────────────── PDF bytes ──────────│
       │                                    │                                    │
       │  files.download.completed          │                                    │
       │  {job_id, file_id, project_id,     │                                    │
       │   file_name, mime_type, file_size, │                                    │
       │   download_url, content_base64}    │                                    │
       │◄───────────────────────────────────│                                    │
       │                                    │                                    │
       │  (decodifica base64 y procesa)     │                                    │
       │                                    │                                    │
```

### Ejemplo de Uso (Cliente Python)

```python
import asyncio
import base64
import json
import uuid
from nats.aio.client import Client as NATS

async def download_file_via_events(file_id: str, user_id: str):
    nc = await nats.connect("nats://localhost:4222")

    job_id = str(uuid.uuid4())
    response_received = asyncio.Event()
    result = {}

    # Suscribirse a la respuesta
    async def handle_response(msg):
        data = json.loads(msg.data.decode())
        if data["payload"]["job_id"] == job_id:
            result.update(data["payload"])
            response_received.set()

    await nc.subscribe("files.download.completed", cb=handle_response)
    await nc.subscribe("files.download.failed", cb=handle_response)

    # Enviar request
    request = {
        "event_id": str(uuid.uuid4()),
        "event_type": "files.download.requested",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "my-service",
        "payload": {
            "job_id": job_id,
            "file_id": file_id,
            "user_id": user_id
        }
    }

    await nc.publish("files.download.requested", json.dumps(request).encode())

    # Esperar respuesta (timeout 30s)
    await asyncio.wait_for(response_received.wait(), timeout=30)

    if "content_base64" in result:
        file_bytes = base64.b64decode(result["content_base64"])
        print(f"Archivo recibido: {result['file_name']} ({len(file_bytes)} bytes)")
        return file_bytes
    else:
        raise Exception(f"Download failed: {result.get('error_message')}")
```

---

## Monitorear Eventos

```bash
# Instalar NATS CLI: https://github.com/nats-io/natscli

# Todos los eventos de files
nats sub 'files.>'

# Solo eventos de upload
nats sub 'files.upload.*'

# Solo eventos de download
nats sub 'files.download.*'

# Solo errores
nats sub 'files.*.failed'

# Solo completados
nats sub 'files.*.completed'
```

---

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

---

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

---

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
FILE_PROJECT_ID=your-project-uuid

# Redis
REDIS_URL=redis://:supersecret@localhost:6379

# NATS
NATS_URL=nats://localhost:4222
```

Ver `.env.example` para todas las variables disponibles.

---

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

---

## Errores Comunes

### Errores REST API

| Código                   | HTTP | Descripción                         |
| ------------------------ | ---- | ----------------------------------- |
| `MISSING_PARAMS`         | 400  | Falta parámetro requerido (user_id) |
| `MISSING_FILE`           | 400  | No se envió archivo o está vacío    |
| `INVALID_UUID`           | 400  | El file_id no es un UUID válido     |
| `NOT_FOUND`              | 404  | Archivo no encontrado               |
| `EXTERNAL_SERVICE_ERROR` | 502  | Error en el file server externo     |

### Errores en Eventos

| error_code        | Descripción                         |
| ----------------- | ----------------------------------- |
| `UPLOAD_FAILED`   | Error durante el upload             |
| `DOWNLOAD_FAILED` | Error durante el download           |
| `NOT_FOUND`       | Archivo no existe en el file server |
| `TIMEOUT`         | Timeout en comunicación externa     |
| `INVALID_UUID`    | UUID malformado                     |

---
