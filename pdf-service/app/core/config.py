from __future__ import annotations

from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---- File server ----
    FILE_SERVER: str = Field(...)
    FILE_ACCESS_KEY: SecretStr = Field(...)
    FILE_SECRET_KEY: SecretStr = Field(...)
    FILE_PROJECT_ID: str = Field(...)

    # ---- App ----
    SERVER_PORT: int = Field(..., ge=1, le=65535)

    ENV: str = Field(default="dev")  # dev | prod
    LOG_DIR: str = Field(default="logs")
    LOG_LEVEL: str = Field(default="INFO")
    LOG_JSON: bool = Field(default=True)

    # ---- Redis (Jobs/Workers/Queue) ----
    REDIS_HOST: str = Field(default="127.0.0.1")
    REDIS_PORT: int = Field(default=6379, ge=1, le=65535)
    REDIS_DB: int = Field(default=0, ge=0)
    REDIS_PASSWORD: SecretStr | None = Field(default=None)

    # claves/colas para jobs
    REDIS_QUEUE_PDF_JOBS: str = Field(default="queue:pdf:jobs")
    REDIS_JOB_TTL_SECONDS: int = Field(default=60 * 60, ge=60)

    @field_validator("FILE_SERVER", "FILE_PROJECT_ID")
    @classmethod
    def _non_empty_str(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("must not be empty")
        return v

    @field_validator("REDIS_HOST")
    @classmethod
    def _redis_host_non_empty(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("REDIS_HOST must not be empty")
        return v

    @property
    def log_dir_path(self) -> Path:
        return BASE_DIR / self.LOG_DIR


def get_settings() -> Settings:
    return Settings()
