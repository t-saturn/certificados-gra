"""
Configuration settings for pdf-svc.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# Load .env file explicitly
_env_file = Path(__file__).parent.parent.parent.parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file)


class RedisSettings(BaseSettings):
    """Redis configuration."""

    model_config = SettingsConfigDict(env_prefix="REDIS_", extra="ignore")

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

    model_config = SettingsConfigDict(env_prefix="NATS_", extra="ignore")

    url: str = Field(default="nats://127.0.0.1:4222")


class FileSvcSettings(BaseSettings):
    """File service configuration."""

    model_config = SettingsConfigDict(env_prefix="FILE_SVC_", extra="ignore")

    # HTTP endpoints
    base_url: str = Field(default="http://localhost:8080")
    upload_url: str = Field(default="http://localhost:8080/upload")

    # NATS subjects (only for download - upload uses HTTP)
    download_subject: str = Field(default="files.download.requested")
    download_completed_subject: str = Field(default="files.download.completed")
    download_failed_subject: str = Field(default="files.download.failed")


class PdfSvcSettings(BaseSettings):
    """PDF service subjects configuration."""

    model_config = SettingsConfigDict(env_prefix="PDF_SVC_", extra="ignore")

    process_subject: str = Field(default="pdf.batch.requested")
    completed_subject: str = Field(default="pdf.batch.completed")
    failed_subject: str = Field(default="pdf.batch.failed")
    item_completed_subject: str = Field(default="pdf.item.completed")
    item_failed_subject: str = Field(default="pdf.item.failed")


class QrSettings(BaseSettings):
    """QR code configuration."""

    model_config = SettingsConfigDict(env_prefix="QR_", extra="ignore")

    logo_url: str | None = Field(default=None)
    logo_path: str | None = Field(default="./assets/logo.png")
    logo_cache_path: str = Field(default="./assets/cached_logo.png")


class LogSettings(BaseSettings):
    """Logging configuration."""

    model_config = SettingsConfigDict(env_prefix="LOG_", extra="ignore")

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
    
    # Template cache directory (TTL: 1 day)
    cache_dir: str = Field(default="./cache/templates")

    # Sub-settings (instantiated fresh to pick up env vars)
    @property
    def redis(self) -> RedisSettings:
        return RedisSettings()

    @property
    def nats(self) -> NatsSettings:
        return NatsSettings()

    @property
    def file_svc(self) -> FileSvcSettings:
        return FileSvcSettings()

    @property
    def pdf_svc(self) -> PdfSvcSettings:
        return PdfSvcSettings()

    @property
    def qr(self) -> QrSettings:
        return QrSettings()

    @property
    def log(self) -> LogSettings:
        return LogSettings()


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
