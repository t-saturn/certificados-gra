# File Gateway

Gateway HTTP + Event-driven para el ecosistema de microservicios de certificados.

- **REST (Axum):**
  - Proxy de `/health` hacia File Server
  - Streaming proxy de archivos públicos `/public/files/:file_id`
  - Upload multipart `/api/v1/files` (firma HMAC hacia File Server)
  - Consulta de jobs `/jobs/:job_id` (status desde Redis)
- **Events (NATS):**
  - Consume eventos `files.upload.requested`
  - Ejecuta upload a File Server
  - Persiste el estado del job en Redis: `PENDING | FAILED | SUCCESS`
  - Publica eventos de salida:
    - `files.upload.completed`
    - `files.upload.failed`

---

## Requisitos

- Docker
- Rust (cargo)
- Servicios:
  - Redis (con password)
  - NATS

---

## Variables de entorno

Ejemplo `.env`:

```env
FILE_BASE_URL=https://files-demo.regionayacucho.gob.pe
FILE_PUBLIC_URL=https://files-demo.regionayacucho.gob.pe/public
FILE_API_URL=https://files-demo.regionayacucho.gob.pe/api/v1
FILE_ACCESS_KEY=...
FILE_SECRET_KEY=...
FILE_PROJECT_ID=...

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=supersecret
REDIS_JOB_TTL_SECONDS=3600
REDIS_KEY_PREFIX=filegw

NATS_URL=nats://127.0.0.1:4222

HTTP_HOST=0.0.0.0
HTTP_PORT=8080

RUST_LOG=info
LOG_DIR=./logs
```

---

## Levantar dependencias con Docker

### Redis (con password)

```bash
docker run -d --name certgra_redis \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine redis-server --requirepass "supersecret"
```

### NATS

```bash
docker run -d --name certgra_nats \
  -p 4222:4222 \
  --restart unless-stopped \
  nats:2.10-alpine
```

Verifica que corren:

```bash
docker ps --filter "name=certgra_redis"
docker ps --filter "name=certgra_nats"
```

---

## Iniciar el servicio

Con Makefile:

```bash
make dev
```

O normal:

```bash
cargo run
```

Deberías ver logs tipo:

- Redis conectado
- NATS conectado
- Consumer iniciado
- HTTP listening

---

# REST API

> Reemplaza `{{file_gateway_url}}` por tu URL base.
>
> Ejemplo:
>
> - `{{file_gateway_url}} = http://localhost:8080`

---

## 1) Health proxy

### GET `{{file_gateway_url}}/health`

```bash
curl "{{file_gateway_url}}/health"
```

### GET `{{file_gateway_url}}/health?db=true`

```bash
curl "{{file_gateway_url}}/health?db=true"
```

---

## 2) Descargar archivo público (streaming proxy)

### GET `{{file_gateway_url}}/public/files/:file_id`

**Descarga en streaming** desde File Server público.

```bash
curl -I "{{file_gateway_url}}/public/files/<uuid>"
```

Ejemplo:

```bash
curl -I "{{file_gateway_url}}/public/files/ad12de99-dafa-4d4a-82cb-d72d0e9aafe1"
```

**Errores:**

- UUID inválido:

```json
{
  "success": false,
  "message": "ID inválido",
  "data": null,
  "error": {
    "code": "INVALID_UUID",
    "details": "El ID del archivo debe ser un UUID válido"
  }
}
```

- No encontrado:

```json
{
  "status": "failed",
  "message": "File not found",
  "data": null
}
```

---

## 3) Subir archivo vía REST (multipart)

### POST `{{file_gateway_url}}/api/v1/files`

Campos esperados:

- `user_id` (string)
- `is_public` (true/false o 1/0)
- `file` (archivo)

Ejemplo:

```bash
curl -X POST "{{file_gateway_url}}/api/v1/files" \
  -F "user_id=00000000-0000-0000-0000-000000000001" \
  -F "is_public=true" \
  -F "file=@./test.pdf;type=application/pdf"
```

Respuesta esperada:

```json
{
  "status": "success",
  "message": "Archivo subido correctamente",
  "data": {
    "id": "...",
    "original_name": "...",
    "size": 123,
    "mime_type": "application/pdf",
    "is_public": true,
    "created_at": "..."
  }
}
```

---

## 4) Consultar job status

### GET `{{file_gateway_url}}/jobs/:job_id`

```bash
curl "{{file_gateway_url}}/jobs/<job_uuid>"
```

Ejemplo:

```bash
curl "{{file_gateway_url}}/jobs/44444444-4444-4444-4444-444444444444"
```

Respuesta (FAILED ejemplo):

```json
{
  "data": {
    "job_id": "44444444-4444-4444-4444-444444444444",
    "state": "FAILED",
    "error": {
      "code": "UPLOAD_FAILED",
      "message": "..."
    }
  },
  "message": "ok",
  "status": "success"
}
```

---

# EVENTS (NATS)

## Subject de entrada

- `files.upload.requested`

Payload esperado (JSON):

```json
{
  "job_id": "22222222-2222-2222-2222-222222222222",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "is_public": true,
  "filename": "test.pdf",
  "content_type": "application/pdf",
  "content_base64": "SG9sYQ=="
}
```

> `content_base64` debe ser el contenido del archivo en base64.
> `job_id` viene del sistema que dispara el evento (idempotencia y trazabilidad).

---

## Publicar evento con nats-box (Docker)

### Linux/macOS (host.docker.internal puede variar)

```bash
docker run --rm natsio/nats-box:latest sh -lc \
'nats pub files.upload.requested --server nats://host.docker.internal:4222 "{\"job_id\":\"22222222-2222-2222-2222-222222222222\",\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"is_public\":true,\"filename\":\"test.pdf\",\"content_type\":\"application/pdf\",\"content_base64\":\"SG9sYQ==\"}"'
```

### Windows PowerShell

```powershell
docker run --rm natsio/nats-box:latest sh -lc 'nats pub files.upload.requested --server nats://host.docker.internal:4222 "{\"job_id\":\"22222222-2222-2222-2222-222222222222\",\"user_id\":\"00000000-0000-0000-0000-000000000001\",\"is_public\":true,\"filename\":\"test.pdf\",\"content_type\":\"application/pdf\",\"content_base64\":\"SG9sYQ==\"}"'
```

> Si tu host no resuelve `host.docker.internal`, usa `--network host` en Linux, o publica desde tu host (sin Docker).

---

## Suscribirte para ver eventos (debug)

```bash
docker run --rm natsio/nats-box:latest sh -lc \
"nats sub files.upload.completed --server nats://host.docker.internal:4222"
```

Y en otra terminal:

```bash
docker run --rm natsio/nats-box:latest sh -lc \
"nats sub files.upload.failed --server nats://host.docker.internal:4222"
```

---

# Verificar en Redis (Jobs)

Los jobs se guardan como:

- Key: `{{REDIS_KEY_PREFIX}}:jobs:<job_id>`

  - Ej: `filegw:jobs:22222222-2222-2222-2222-222222222222`

Estados:

- `PENDING` (string simple)
- `FAILED` (JSON)
- `SUCCESS` (JSON)

---

## Entrar a redis-cli dentro del contenedor

```bash
docker exec -it certgra_redis redis-cli -a supersecret
```

### Buscar jobs

```redis
KEYS filegw:jobs:*
```

### Leer job

```redis
GET filegw:jobs:22222222-2222-2222-2222-222222222222
```

### Ver TTL

```redis
TTL filegw:jobs:22222222-2222-2222-2222-222222222222
```

Ejemplo SUCCESS:

```json
{ "result": { "file_id": "..." }, "status": "SUCCESS" }
```

Ejemplo FAILED:

```json
{ "error": { "code": "UPLOAD_FAILED", "message": "..." }, "status": "FAILED" }
```

---

# Notas de diseño

- **job_id** viene desde el productor del evento:

  - Permite idempotencia (si llega el mismo evento 2 veces, no re-procesa)
  - Permite trazabilidad end-to-end entre microservicios (correlation id)

- El Gateway expone `/jobs/:job_id` para que cualquier servicio o UI consulte el estado.

---

## Troubleshooting rápido

- Si NATS no recibe:

  - Confirma contenedor: `docker logs certgra_nats`
  - Confirma URL: `NATS_URL=nats://127.0.0.1:4222`
  - Si publicas desde nats-box: usa `host.docker.internal`

- Si Redis no muestra keys:

  - Confirma password correcto
  - `docker exec -it certgra_redis redis-cli -a supersecret PING`
  - `KEYS filegw:jobs:*`
