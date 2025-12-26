from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Redis
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_JOB_TTL_SECONDS: int = 3600
    REDIS_KEY_PREFIX: str = "pdfsvc"

    # Queues
    REDIS_QUEUE_PDF_DOWNLOAD: str = "queue:pdf:download"
    REDIS_QUEUE_PDF_RENDER: str = "queue:pdf:render"
    REDIS_QUEUE_PDF_QR: str = "queue:pdf:qr"
    REDIS_QUEUE_PDF_INSERT: str = "queue:pdf:insert"
    REDIS_QUEUE_PDF_UPLOAD: str = "queue:pdf:upload"

    # NATS
    NATS_URL: str = "nats://127.0.0.1:4222"

    # Logging
    LOG_DIR: str = "./logs"
    LOG_FILE: str = "pdf-service.log"
    LOG_LEVEL: str = "info"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
