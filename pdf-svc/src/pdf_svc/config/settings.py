"""
Configuration settings for pdf-svc.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseSettings):
    """Redis configuration."""

    model_config = SettingsConfigDict(env_prefix="REDIS_")

    host: str = Field(default="127.0.0.1")
    port: int = Field(default=6379)
    db: int = Field(default=0)
    password: str = Field(default="supersecret")

    queue_pdf_jobs: str = Field(default="queue:pdf:jobs")
    job_ttl_seconds: int = Field(default=3600)
    key_prefix: str = Field(default="pdfsvc")

    @property
    def url(self) -> str:
        """Build Redis URL."""
        if self.password:
            return f"redis://:{self.password}@{self.host}:{self.port}/{self.db}"
        return f"redis://{self.host}:{self.port}/{self.db}"


class NatsSettings(BaseSettings):
    """NATS configuration."""

    model_config = SettingsConfigDict(env_prefix="NATS_")

    url: str = Field(default="nats://127.0.0.1:4222")


class FileSvcSettings(BaseSettings):
    """File service subjects configuration."""

    model_config = SettingsConfigDict(env_prefix="FILE_SVC_")

    download_subject: str = Field(default="files.download.requested")
    upload_subject: str = Field(default="files.upload.requested")
    download_completed_subject: str = Field(default="files.download.completed")
    download_failed_subject: str = Field(default="files.download.failed")
    upload_completed_subject: str = Field(default="files.upload.completed")
    upload_failed_subject: str = Field(default="files.upload.failed")


class PdfSvcSettings(BaseSettings):
    """PDF service subjects configuration."""

    model_config = SettingsConfigDict(env_prefix="PDF_SVC_")

    process_subject: str = Field(default="pdf.batch.requested")
    completed_subject: str = Field(default="pdf.batch.completed")
    failed_subject: str = Field(default="pdf.batch.failed")
    item_completed_subject: str = Field(default="pdf.item.completed")
    item_failed_subject: str = Field(default="pdf.item.failed")


class QrSettings(BaseSettings):
    """QR code configuration."""

    model_config = SettingsConfigDict(env_prefix="QR_")

    logo_url: str | None = Field(default=None)
    logo_path: str | None = Field(default="./assets/logo.png")
    logo_cache_path: str = Field(default="./assets/cached_logo.png")


class LogSettings(BaseSettings):
    """Logging configuration."""

    model_config = SettingsConfigDict(env_prefix="LOG_")

    dir: str = Field(default="./logs")
    file: str = Field(default="pdf-svc.log")
    level: str = Field(default="DEBUG")
    format: str = Field(default="json")


class Settings(BaseSettings):
    """Main application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    environment: str = Field(default="development")
    temp_dir: str = Field(default="./tmp")

    # Sub-settings
    redis: RedisSettings = Field(default_factory=RedisSettings)
    nats: NatsSettings = Field(default_factory=NatsSettings)
    file_svc: FileSvcSettings = Field(default_factory=FileSvcSettings)
    pdf_svc: PdfSvcSettings = Field(default_factory=PdfSvcSettings)
    qr: QrSettings = Field(default_factory=QrSettings)
    log: LogSettings = Field(default_factory=LogSettings)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
