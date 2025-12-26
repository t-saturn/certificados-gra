from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol
from uuid import UUID

import httpx


class FilesRepository(Protocol):
    async def download(self, *, file_id: UUID, headers: Mapping[str, str], timeout: float = 30.0) -> httpx.Response: ...
    async def upload_file(
        self,
        *,
        headers: Mapping[str, str],
        project_id: UUID,
        user_id: str,
        is_public: bool,
        filename: str,
        content_type: str,
        content: bytes,
        timeout: float = 60.0,
    ) -> httpx.Response: ...


def _root_from_public(public_base_url: str) -> str:
    u = public_base_url.rstrip("/")
    return u[:-len("/public")] if u.endswith("/public") else u


@dataclass(frozen=True)
class HttpFilesRepository(FilesRepository):
    public_base_url: str
    client: httpx.AsyncClient

    async def download(self, *, file_id: UUID, headers: Mapping[str, str], timeout: float = 30.0) -> httpx.Response:
        url = f"{self.public_base_url.rstrip('/')}/files/{file_id}"
        return await self.client.get(url, headers=dict(headers), timeout=timeout)

    async def upload_file(
        self,
        *,
        headers: Mapping[str, str],
        project_id: UUID,
        user_id: str,
        is_public: bool,
        filename: str,
        content_type: str,
        content: bytes,
        timeout: float = 60.0,
    ) -> httpx.Response:
        api_root = _root_from_public(self.public_base_url).rstrip("/")
        url = f"{api_root}/api/v1/files"

        files = {"file": (filename, content, content_type or "application/octet-stream")}
        data = {
            "project_id": str(project_id),
            "user_id": user_id,
            "is_public": "true" if is_public else "false",
        }

        return await self.client.post(url, headers=dict(headers), data=data, files=files, timeout=timeout)
