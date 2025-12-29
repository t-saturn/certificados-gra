# pdf-svc

Microservicio de generación de PDFs orientado a eventos usando NATS y Redis.

## Descripción

`pdf-svc` procesa lotes de PDFs de forma asíncrona:

1. Recibe solicitud de procesamiento batch via NATS
2. Descarga plantilla desde `file-svc`
3. Reemplaza placeholders en el PDF
4. Genera código QR
5. Inserta QR en el PDF
6. Sube resultado a `file-svc`
7. Publica eventos de resultado

## Requisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (gestor de paquetes)
- Redis (puerto 6379)
- NATS (puerto 4222)
- file-svc (puerto 8080)

## Pasos de Instalación y Ejecución

### 1. Instalar uv (si no lo tienes)

```bash
# Linux/macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Clonar/Descargar el proyecto

```bash
cd pdf-svc
```

### 3. Configurar variables de entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar si es necesario (los valores por defecto funcionan con la config actual)
# Redis: 127.0.0.1:6379 (password: supersecret)
# NATS: 127.0.0.1:4222
```

### 4. Instalar dependencias

```bash
# Esto crea .venv e instala todo
make setup

# O directamente:
uv sync --all-extras
```

### 5. Ejecutar el servicio

```bash
# Opción 1: make
make run

# Opción 2: directamente
uv run python -m pdf_svc.main
```

### 6. Verificar que está funcionando

Deberías ver logs como:

```
2025-12-29 02:30:00.123 [info] starting_service environment=development
2025-12-29 02:30:00.234 [info] redis_connected host=127.0.0.1 port=6379
2025-12-29 02:30:00.345 [info] nats_connected url=nats://127.0.0.1:4222
2025-12-29 02:30:00.456 [info] service_started process_subject=pdf.batch.requested
2025-12-29 02:30:00.567 [info] service_running message=Press Ctrl+C to stop
```

## Ejecutar Tests

```bash
# Todos los tests
make test

# Solo unit tests
make test-unit

# Solo integration tests
make test-int

# Con coverage
make test-cov
```

## Estructura del Proyecto

```
pdf-svc/
├── src/pdf_svc/
│   ├── config/           # Configuración
│   ├── models/           # Job, Events
│   ├── dto/              # Request/Response DTOs
│   ├── services/         # Lógica de negocio
│   │   ├── qr_service.py
│   │   ├── pdf_replace_service.py
│   │   ├── pdf_qr_insert_service.py
│   │   └── pdf_orchestrator.py
│   ├── repositories/     # Acceso a datos
│   ├── events/           # Handlers NATS
│   ├── shared/           # Logger, utils
│   └── main.py           # Entry point
├── tests/
│   ├── test_unit_*.py         # Tests unitarios
│   └── test_integration_*.py  # Tests de integración
├── Dockerfile
├── Makefile
└── pyproject.toml
```

## API de Eventos

### Request: Batch Processing

**Subject:** `pdf.batch.requested`

```json
{
  "event_type": "pdf.batch.requested",
  "payload": {
    "pdf_job_id": "uuid",
    "items": [
      {
        "user_id": "uuid",
        "template_id": "uuid",
        "serial_code": "CERT-2025-000001",
        "is_public": true,
        "pdf": [
          {"key": "nombre_participante", "value": "MARÍA LUQUE RIVERA"},
          {"key": "fecha", "value": "28/12/2024"}
        ],
        "qr": [
          {"base_url": "https://example.com/verify"},
          {"verify_code": "CERT-2025-000001"}
        ],
        "qr_pdf": [
          {"qr_size_cm": "2.5"},
          {"qr_margin_y_cm": "1.0"},
          {"qr_page": "0"}
        ]
      }
    ]
  }
}
```

### Response: Batch Completed

**Subject:** `pdf.batch.completed`

```json
{
  "event_type": "pdf.batch.completed",
  "payload": {
    "pdf_job_id": "uuid",
    "job_id": "uuid",
    "status": "completed",
    "total_items": 10,
    "success_count": 9,
    "failed_count": 1,
    "items": [
      {
        "item_id": "uuid",
        "user_id": "uuid",
        "serial_code": "CERT-2025-000001",
        "status": "completed",
        "data": {
          "file_id": "uuid",
          "file_name": "CERT-2025-000001.pdf",
          "file_size": 123456,
          "file_hash": "sha256...",
          "mime_type": "application/pdf",
          "is_public": true,
          "download_url": "https://...",
          "processing_time_ms": 1234
        }
      },
      {
        "item_id": "uuid",
        "user_id": "uuid",
        "serial_code": "CERT-2025-000002",
        "status": "failed",
        "error": {
          "user_id": "uuid",
          "status": "failed",
          "message": "Template not found",
          "stage": "download",
          "code": "NOT_FOUND"
        }
      }
    ],
    "processing_time_ms": 5432
  }
}
```

### Response: Batch Failed

**Subject:** `pdf.batch.failed`

```json
{
  "event_type": "pdf.batch.failed",
  "payload": {
    "pdf_job_id": "uuid",
    "job_id": null,
    "status": "failed",
    "message": "Validation error: missing pdf_job_id",
    "code": "VALIDATION_ERROR"
  }
}
```

### Real-time Item Events

**Subject:** `pdf.item.completed` / `pdf.item.failed`

```json
{
  "event_type": "pdf.item.failed",
  "payload": {
    "pdf_job_id": "uuid",
    "job_id": "uuid",
    "item_id": "uuid",
    "user_id": "uuid",
    "serial_code": "CERT-2025-000001",
    "status": "failed",
    "message": "Template not found in storage",
    "stage": "download",
    "code": "NOT_FOUND"
  }
}
```

## Debugging con NATS CLI

```bash
# Instalar NATS CLI: https://github.com/nats-io/natscli

# Suscribirse a eventos de pdf-svc
make nats-sub
# o: nats sub 'pdf.>'

# Suscribirse a eventos de file-svc
make nats-sub-files
# o: nats sub 'files.>'

# Publicar evento de prueba
make nats-pub
```

## Comandos Make Disponibles

| Comando | Descripción |
|---------|-------------|
| `make setup` | Instalar dependencias (crea .venv) |
| `make sync` | Sincronizar dependencias |
| `make run` | Ejecutar el servicio |
| `make dev` | Ejecutar con auto-reload |
| `make test` | Ejecutar todos los tests |
| `make test-unit` | Solo tests unitarios |
| `make test-int` | Solo tests de integración |
| `make lint` | Verificar código |
| `make format` | Formatear código |
| `make clean` | Limpiar artefactos |

## Configuración

### Variables de Entorno

```bash
# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=supersecret

# NATS
NATS_URL=nats://127.0.0.1:4222

# Subjects
PDF_SVC_PROCESS_SUBJECT=pdf.batch.requested
PDF_SVC_COMPLETED_SUBJECT=pdf.batch.completed

# Logging
LOG_LEVEL=DEBUG
```

Ver `.env.example` para todas las variables.

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Caller       │────▶│    pdf-svc      │────▶│    file-svc     │
│   (worker)      │     │  (processing)   │     │   (storage)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              ┌─────────┐           ┌─────────┐
              │  Redis  │           │  NATS   │
              │  (jobs) │           │(events) │
              └─────────┘           └─────────┘
```

## Estados de Item

| Estado | Progreso | Descripción |
|--------|----------|-------------|
| `pending` | 0% | Pendiente |
| `downloading` | 10% | Descargando plantilla |
| `downloaded` | 20% | Plantilla descargada |
| `rendering` | 30% | Reemplazando placeholders |
| `rendered` | 50% | PDF renderizado |
| `generating_qr` | 60% | Generando QR |
| `qr_generated` | 70% | QR generado |
| `inserting_qr` | 80% | Insertando QR |
| `qr_inserted` | 85% | QR insertado |
| `uploading` | 90% | Subiendo resultado |
| `completed` | 100% | Completado |
| `failed` | - | Error |

## Docker

```bash
# Construir imagen
make docker-build
# o: docker build -t pdf-svc:latest .
```

La imagen se integra con el docker-compose del repositorio principal.

## Licencia

MIT
