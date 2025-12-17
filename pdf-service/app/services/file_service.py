from __future__ import annotations

import hmac
import hashlib
import time
from dataclasses import dataclass
from typing import Dict
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.repositories.files_repository import FilesRepository


def _sign(secret_key: str, method: str, path: str, timestamp: str) -> str:
    string_to_sign = f"{method}\n{path}\n{timestamp}"
    return hmac.new(
        secret_key.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass(frozen=True)
class FileService:
    settings: Settings
    repo: FilesRepository

    async def fn_download_file(self, file_id: UUID) -> httpx.Response:
        """
        Contract: receives UUID. Route handler should validate/parse.
        """
        method = "GET"
        timestamp = str(int(time.time()))

        # IMPORTANT: sign path WITHOUT /public (matches your Bruno behavior)
        path = f"/files/{file_id}"

        access_key = self.settings.FILE_ACCESS_KEY.get_secret_value()
        secret_key = self.settings.FILE_SECRET_KEY.get_secret_value()

        signature = _sign(secret_key, method, path, timestamp)

        headers: Dict[str, str] = {
            "X-Access-Key": access_key,
            "X-Signature": signature,
            "X-Timestamp": timestamp,
        }

        resp = await self.repo.download(file_id=file_id, headers=headers)

        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found")
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail="Upstream error")

        return resp
