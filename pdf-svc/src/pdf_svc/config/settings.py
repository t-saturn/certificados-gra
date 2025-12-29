"""
Configuration module using pydantic-settings.
Loads environment variables with validation.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class RedisSettings(BaseSettings):
    """Redis connection settings."""

    model_config = SettingsConfigDict(env_prefix="REDIS_", extra="ignore")

    host: str = Field(default="127.0.0.1")
    port: int = Field(default=6379)
    db: int = Field(default=0)
    password: Optional[str] = Field(default=None)
    job_ttl_seconds: int = Field(default=3600)
    key_prefix: str = Field(default="pdfsvc")

    # Queue names
    queue_pdf_download: str = Field(default="queue:pdf:download")
    queue_pdf_render: str = Field(default="queue:pdf:render")
    queue_pdf_qr: str = Field(default="queue:pdf:qr")
    queue_pdf_insert: str = Field(default="queue:pdf:insert")
    queue_pdf_upload: str = Field(default="queue:pdf:upload")

    @property
    def url(self) -> str:
        """Build Redis URL from components."""
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"


class NatsSettings(BaseSettings):
    """NATS connection settings."""

    model_config = SettingsConfigDict(env_prefix="NATS_", extra="ignore")

    url: str = Field(default="nats://127.0.0.1:4222")


class FileSvcSettings(BaseSettings):
    """File service event subjects."""

    model_config = SettingsConfigDict(env_prefix="FILE_SVC_", extra="ignore")

    download_subject: str = Field(default="files.download.requested")
    upload_subject: str = Field(default="files.upload.requested")
    download_completed: str = Field(default="files.download.completed")
    upload_completed: str = Field(default="files.upload.completed")


class PdfSvcSettings(BaseSettings):
    """PDF service event subjects."""

    model_config = SettingsConfigDict(env_prefix="PDF_SVC_", extra="ignore")

    process_subject: str = Field(default="pdf.process.requested")
    completed_subject: str = Field(default="pdf.process.completed")
    failed_subject: str = Field(default="pdf.process.failed")


class QrSettings(BaseSettings):
    """QR code generation settings."""

    model_config = SettingsConfigDict(env_prefix="QR_", extra="ignore")

    logo_url: Optional[str] = Field(default=None)
    logo_path: Optional[Path] = Field(default=None)
    logo_cache_path: Optional[Path] = Field(default=Path("./assets/cached_logo.png"))


class LogSettings(BaseSettings):
    """Logging settings."""

    model_config = SettingsConfigDict(env_prefix="LOG_", extra="ignore")

    dir: Path = Field(default=Path("./logs"))
    file: str = Field(default="pdf-service.log")
    level: Literal["debug", "info", "warning", "error", "critical"] = Field(default="info")
    format: Literal["console", "json"] = Field(default="console")

    @field_validator("dir", mode="before")
    @classmethod
    def ensure_path(cls, v: str | Path) -> Path:
        return Path(v) if isinstance(v, str) else v


class Settings(BaseSettings):
    """Main application settings aggregating all sub-settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "staging", "production"] = Field(default="development")
    temp_dir: Path = Field(default=Path("/tmp/pdf-svc"))

    # Sub-settings (loaded separately)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    nats: NatsSettings = Field(default_factory=NatsSettings)
    file_svc: FileSvcSettings = Field(default_factory=FileSvcSettings)
    pdf_svc: PdfSvcSettings = Field(default_factory=PdfSvcSettings)
    qr: QrSettings = Field(default_factory=QrSettings)
    log: LogSettings = Field(default_factory=LogSettings)

    @field_validator("temp_dir", mode="before")
    @classmethod
    def ensure_temp_path(cls, v: str | Path) -> Path:
        path = Path(v) if isinstance(v, str) else v
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance (singleton)."""
    return Settings()
