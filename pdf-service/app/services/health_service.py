from __future__ import annotations

import hashlib
import os
import platform
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import logging

from pydantic import SecretStr
from app.core.config import Settings

logger = logging.getLogger("health")
def _is_set(value: Optional[object]) -> bool:
    if value is None:
        return False
    if isinstance(value, SecretStr):
        raw = value.get_secret_value()
        return bool(raw and raw.strip())
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _fingerprint(value: Optional[object]) -> Optional[str]:
    """
    Non-reversible short fingerprint for debugging without revealing secrets.
    """
    if value is None:
        return None
    if isinstance(value, SecretStr):
        raw = value.get_secret_value()
    else:
        raw = str(value)
    raw = raw.strip()
    if not raw:
        return None
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]


@dataclass(frozen=True)
class HealthService:
    settings: Settings
    started_at_monotonic: float

    def basic(self) -> Dict[str, Any]:
        return {"status": "ok"}

    def info(self) -> Dict[str, Any]:
        logger.info("health_info_called")
        now = time.monotonic()
        uptime_seconds = max(0.0, now - self.started_at_monotonic)

        # Do NOT expose raw env values. Only expose presence + safe fingerprints.
        config_presence = {
            "FILE_SERVER_set": _is_set(self.settings.FILE_SERVER),
            "FILE_ACCESS_KEY_set": _is_set(self.settings.FILE_ACCESS_KEY),
            "FILE_SECRET_KEY_set": _is_set(self.settings.FILE_SECRET_KEY),
            "FILE_PROJECT_ID_set": _is_set(self.settings.FILE_PROJECT_ID),
            "SERVER_PORT_set": _is_set(self.settings.SERVER_PORT),
        }

        # If you want minimal debugging without secrets:
        config_fingerprints = {
            "FILE_SERVER_fp": _fingerprint(self.settings.FILE_SERVER),
            "FILE_ACCESS_KEY_fp": _fingerprint(self.settings.FILE_ACCESS_KEY),
            "FILE_SECRET_KEY_fp": _fingerprint(self.settings.FILE_SECRET_KEY),
            "FILE_PROJECT_ID_fp": _fingerprint(self.settings.FILE_PROJECT_ID),
        }

        return {
            "status": "ok",
            "uptime_seconds": round(uptime_seconds, 3),
            "service": {
                "name": "fastapi-backend",
                "python": sys.version.split()[0],
                "implementation": platform.python_implementation(),
                "platform": platform.platform(),
            },
            "runtime": {
                "pid": os.getpid(),
                "cwd": str(Path.cwd()),
            },
            "config": {
                "SERVER_PORT": self.settings.SERVER_PORT,  # safe
                **config_presence,
                **config_fingerprints,  # optional: remove this block if you don't want any hashes
            },
        }
