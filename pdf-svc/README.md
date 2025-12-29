# pdf-svc

Event-driven PDF generation microservice using FastStream, NATS, Redis, and PyMuPDF.

## Features

- **Event-driven architecture**: Communicates via NATS events, no REST endpoints
- **Template-based PDF generation**: Replace placeholders in PDF templates
- **QR code insertion**: Generate and embed QR codes with optional logo overlay
- **Auto-placement**: Smart QR positioning for landscape documents
- **Job tracking**: Redis-based job persistence with status updates
- **Structured logging**: JSON logs with daily rotation

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   file-svc      │◄────│    pdf-svc      │────►│     Redis       │
│  (storage)      │     │  (processing)   │     │  (job state)    │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │      ┌────────────────┘
         │      │
         ▼      ▼
    ┌─────────────────┐
    │      NATS       │
    │   (messaging)   │
    └─────────────────┘
```

## Pipeline

1. Receive `PdfProcessRequest` event
2. Request template download from file-svc
3. Render PDF with placeholder replacements
4. Generate QR code PNG
5. Insert QR into rendered PDF
6. Upload final PDF via file-svc
7. Publish `PdfProcessCompleted` event

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local development)

### Run with Docker

```bash
# Start all services
make up

# View logs
make logs

# Stop services
make down
```

### Local Development

```bash
# Install dependencies
make dev

# Run tests
make test

# Run with coverage
make test-cov
```

## Configuration

### Environment Variables

| Variable                | Default               | Description               |
| ----------------------- | --------------------- | ------------------------- |
| `REDIS_HOST`            | localhost             | Redis host                |
| `REDIS_PORT`            | 6379                  | Redis port                |
| `REDIS_DB`              | 0                     | Redis database            |
| `REDIS_PASSWORD`        | -                     | Redis password            |
| `REDIS_JOB_TTL_SECONDS` | 3600                  | Job TTL in Redis          |
| `NATS_URL`              | nats://localhost:4222 | NATS server URL           |
| `LOG_LEVEL`             | INFO                  | Logging level             |
| `LOG_FORMAT`            | json                  | Log format (json/console) |
| `QR_LOGO_URL`           | -                     | URL for QR logo overlay   |
| `QR_LOGO_PATH`          | -                     | Local path for QR logo    |

See `.env.example` for full configuration.

## API Events

### Request

**Subject**: `pdf.process.requested`

```json
{
  "template": "uuid",
  "user_id": "uuid",
  "serial_code": "CERT-2025-000102",
  "is_public": true,
  "qr": [{ "base_url": "https://example.com/verify" }, { "verify_code": "CERT-2025-000102" }],
  "qr_pdf": [
    { "qr_size_cm": "2.5" },
    { "qr_margin_y_cm": "1.0" },
    { "qr_page": "0" },
    { "qr_rect": "460,40,540,120" }
  ],
  "pdf": [
    { "key": "nombre_participante", "value": "MARÍA LUQUE RIVERA" },
    { "key": "fecha", "value": "16/12/2024" }
  ]
}
```

### Response

**Subject**: `pdf.process.completed`

```json
{
  "pdf_job_id": "uuid",
  "file_id": "uuid",
  "file_name": "CERT-2025-000102.pdf",
  "file_hash": "sha256...",
  "file_size_bytes": 123456,
  "download_url": "https://...",
  "created_at": "2025-12-28T...",
  "processing_time_ms": 1234
}
```

## Project Structure

```
pdf-svc/
├── src/pdf_svc/
│   ├── config/           # Settings
│   ├── models/           # Job, Events
│   ├── dto/              # Request/Response DTOs
│   ├── services/         # Business logic
│   │   ├── qr_service.py
│   │   ├── pdf_replace_service.py
│   │   ├── pdf_qr_insert_service.py
│   │   └── pdf_orchestrator.py
│   ├── repositories/     # Data access
│   │   ├── job_repository.py
│   │   └── file_repository.py
│   ├── events/           # NATS handlers
│   ├── shared/           # Logger, utils
│   └── main.py          # Entry point
├── tests/               # Unit tests
├── assets/              # Logo assets
├── logs/                # Log files
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

## Development

### Run Tests

```bash
# All tests
make test

# With coverage
make test-cov

# Specific test file
PYTHONPATH=src pytest tests/test_qr_service.py -v
```

### Linting & Formatting

```bash
make lint
make format
make typecheck
```

### Debugging

```bash
# Open NATS CLI
make nats-box

# Subscribe to events
make sub

# Publish test event
make pub

# Open Redis CLI
make redis-cli
```

## Production Deployment

```bash
# Build production image
make prod-build

# Deploy
make prod-up

# Or manually:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
