from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol, Tuple, Optional, AsyncIterator
from uuid import UUID

import httpx


class FilesRepository(Protocol):
    async def download(
        self, *,
        file_id: UUID,
        headers: Mapping[str, str],
        timeout: float = 30.0,
    ) -> httpx.Response:
        ...


@dataclass(frozen=True)
class HttpFilesRepository(FilesRepository):
    """
    SRP: only talks to external FILE_SERVER.
    """
    base_url: str
    client: httpx.AsyncClient

    async def download(
        self, *,
        file_id: UUID,
        headers: Mapping[str, str],
        timeout: float = 30.0,
    ) -> httpx.Response:
        url = f"{self.base_url.rstrip('/')}/files/{file_id}"
        # streaming response
        return await self.client.get(url, headers=dict(headers), timeout=timeout)
