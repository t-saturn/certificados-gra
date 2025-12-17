from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Dict
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.repositories.files_repository import FilesRepository


def _sign(secret_key: str, method: str, path: str, timestamp: str) -> str:
    """
    Bruno-compatible signature:
      stringToSign = METHOD + "\n" + PATH + "\n" + TIMESTAMP
      signature = HMAC_SHA256_HEX(secret, stringToSign)
    """
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

    def _auth_headers(self, *, method: str, path: str) -> Dict[str, str]:
        timestamp = str(int(time.time()))
        access_key = self.settings.FILE_ACCESS_KEY.get_secret_value()
        secret_key = self.settings.FILE_SECRET_KEY.get_secret_value()

        signature = _sign(secret_key, method, path, timestamp)

        return {
            "X-Access-Key": access_key,
            "X-Signature": signature,
            "X-Timestamp": timestamp,
        }

    async def fn_download_file(self, file_id: UUID) -> httpx.Response:
        # IMPORTANT: sign path WITHOUT /public (matches Bruno)
        path = f"/files/{file_id}"
        headers = self._auth_headers(method="GET", path=path)

        resp = await self.repo.download(file_id=file_id, headers=headers)

        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="File not found")
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail="Upstream error")

        return resp

    async def fn_upload_file(
        self,
        *,
        user_id: str,
        is_public: bool,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> httpx.Response:
        # Upload endpoint (API)
        path = "/api/v1/files"
        headers = self._auth_headers(method="POST", path=path)

        # project_id MUST come from env (FILE_PROJECT_ID)
        try:
            project_uuid = UUID(self.settings.FILE_PROJECT_ID)
        except ValueError:
            raise HTTPException(status_code=500, detail="Invalid FILE_PROJECT_ID in env")

        resp = await self.repo.upload_file(
            headers=headers,
            project_id=project_uuid,
            user_id=user_id,
            is_public=is_public,
            filename=filename,
            content_type=content_type,
            content=content,
        )

        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail="Upstream error")

        return resp
