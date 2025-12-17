from __future__ import annotations

from pathlib import Path
from pydantic import Field, field_validator, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    FILE_SERVER: str = Field(...)
    FILE_ACCESS_KEY: SecretStr = Field(...)
    FILE_SECRET_KEY: SecretStr = Field(...)
    FILE_PROJECT_ID: str = Field(...)
    SERVER_PORT: int = Field(..., ge=1, le=65535)

    ENV: str = Field(default="dev")          # dev | prod
    LOG_DIR: str = Field(default="logs")
    LOG_LEVEL: str = Field(default="INFO")
    LOG_JSON: bool = Field(default=True)

    @field_validator("FILE_SERVER", "FILE_PROJECT_ID")
    @classmethod
    def _non_empty_str(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("must not be empty")
        return v

    @property
    def log_dir_path(self) -> Path:
        return BASE_DIR / self.LOG_DIR


def get_settings() -> Settings:
    return Settings()
