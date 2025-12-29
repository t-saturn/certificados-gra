"""
File Repository - Communication with file-svc via NATS events and HTTP.

Download: via NATS events (files.download.requested/completed)
Upload: via HTTP REST API (POST /upload)
"""

from __future__ import annotations

import asyncio
import base64
from typing import Any
from uuid import UUID, uuid4

import httpx
import structlog
from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import Settings
from pdf_svc.models.events import (
    FileDownloadRequest,
    FileDownloadRequestPayload,
)

logger = structlog.get_logger()


class FileRepository:
    """Repository for file operations via file-svc."""

    def __init__(
        self,
        nats_client: NatsClient,
        settings: Settings,
        timeout: float = 30.0,
    ) -> None:
        """
        Initialize file repository.

        Args:
            nats_client: Connected NATS client
            settings: Application settings
            timeout: Default timeout for operations in seconds
        """
        self.nats = nats_client
        self.settings = settings
        self.timeout = timeout

        # HTTP client for uploads
        self._http_client: httpx.AsyncClient | None = None

        # Pending download operations tracking
        self._pending_downloads: dict[UUID, asyncio.Future] = {}

        # Subscriptions
        self._download_completed_sub = None
        self._download_failed_sub = None

    async def start(self) -> None:
        """Start listening for file-svc events."""
        log = logger.bind(component="file_repository")

        # Initialize HTTP client
        self._http_client = httpx.AsyncClient(timeout=self.timeout)

        # Subscribe to download events
        self._download_completed_sub = await self.nats.subscribe(
            self.settings.file_svc.download_completed_subject,
            cb=self._handle_download_completed,
        )
        self._download_failed_sub = await self.nats.subscribe(
            self.settings.file_svc.download_failed_subject,
            cb=self._handle_download_failed,
        )

        log.info(
            "file_repository_started",
            download_subject=self.settings.file_svc.download_completed_subject,
            upload_url=self.settings.file_svc.upload_url,
        )

    async def stop(self) -> None:
        """Stop listening for events and close connections."""
        # Close HTTP client
        if self._http_client:
            await self._http_client.aclose()

        # Unsubscribe from NATS
        for sub in [
            self._download_completed_sub,
            self._download_failed_sub,
        ]:
            if sub:
                await sub.unsubscribe()

        # Cancel pending operations
        for future in list(self._pending_downloads.values()):
            if not future.done():
                future.cancel()

        logger.info("file_repository_stopped")

    async def download_file(
        self,
        file_id: UUID,
        user_id: UUID,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """
        Download file from file-svc via NATS events.

        Sends: files.download.requested
        Receives: files.download.completed (with content_base64)

        Args:
            file_id: ID of file to download
            user_id: User requesting download
            timeout: Override default timeout

        Returns:
            Result dict with:
                - success: bool
                - data: bytes (the file content)
                - file_name: str
                - file_size: int
                - mime_type: str
                - error: str (if failed)
        """
        job_id = uuid4()
        log = logger.bind(job_id=str(job_id), file_id=str(file_id))

        # Create future for result
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_downloads[job_id] = future

        try:
            # Publish request
            event = FileDownloadRequest(
                payload=FileDownloadRequestPayload(
                    job_id=job_id,
                    file_id=file_id,
                    user_id=user_id,
                )
            )

            await self.nats.publish(
                self.settings.file_svc.download_subject,
                event.model_dump_json().encode(),
            )

            log.debug("download_requested")

            # Wait for result
            result = await asyncio.wait_for(
                future,
                timeout=timeout or self.timeout,
            )

            return result

        except asyncio.TimeoutError:
            log.error("download_timeout")
            return {"success": False, "error": "Download timeout"}

        except Exception as e:
            log.error("download_error", error=str(e))
            return {"success": False, "error": str(e)}

        finally:
            self._pending_downloads.pop(job_id, None)

    async def upload_file(
        self,
        user_id: UUID,
        file_data: bytes,
        file_name: str,
        is_public: bool = True,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """
        Upload file to file-svc via HTTP REST API.

        POST /upload (multipart/form-data)

        Args:
            user_id: User uploading file
            file_data: File content as bytes
            file_name: Name for uploaded file
            is_public: Whether file is public
            timeout: Override default timeout

        Returns:
            Result dict with:
                - success: bool
                - file_id: UUID
                - file_name: str
                - file_size: int
                - download_url: str
                - error: str (if failed)
        """
        log = logger.bind(file_name=file_name, user_id=str(user_id))

        if not self._http_client:
            return {"success": False, "error": "HTTP client not initialized"}

        try:
            # Prepare multipart form data
            files = {
                "file": (file_name, file_data, "application/pdf"),
            }
            data = {
                "user_id": str(user_id),
                "is_public": str(is_public).lower(),
            }

            log.debug("upload_started", size=len(file_data))

            # POST to file-svc upload endpoint
            response = await self._http_client.post(
                self.settings.file_svc.upload_url,
                files=files,
                data=data,
                timeout=timeout or self.timeout,
            )

            if response.status_code == 200:
                result = response.json()
                file_data_response = result.get("data", {})

                log.info(
                    "upload_completed",
                    file_id=file_data_response.get("id"),
                    size=file_data_response.get("size"),
                )

                return {
                    "success": True,
                    "file_id": UUID(file_data_response.get("id")) if file_data_response.get("id") else None,
                    "file_name": file_data_response.get("original_name"),
                    "file_size": file_data_response.get("size"),
                    "mime_type": file_data_response.get("mime_type"),
                    "is_public": file_data_response.get("is_public"),
                    "download_url": f"{self.settings.file_svc.base_url}/download?file_id={file_data_response.get('id')}",
                    "created_at": file_data_response.get("created_at"),
                }
            else:
                error_msg = f"Upload failed with status {response.status_code}"
                try:
                    error_data = response.json()
                    error_msg = error_data.get("message", error_msg)
                except Exception:
                    pass

                log.error("upload_failed", status=response.status_code, error=error_msg)
                return {"success": False, "error": error_msg}

        except httpx.TimeoutException:
            log.error("upload_timeout")
            return {"success": False, "error": "Upload timeout"}

        except Exception as e:
            log.error("upload_error", error=str(e))
            return {"success": False, "error": str(e)}

    async def _handle_download_completed(self, msg) -> None:
        """Handle download completed event from file-svc."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_downloads:
                future = self._pending_downloads[job_id]
                if not future.done():
                    # Decode base64 content
                    file_data = None
                    content_base64 = payload.get("content_base64")
                    if content_base64:
                        file_data = base64.b64decode(content_base64)

                    future.set_result({
                        "success": True,
                        "data": file_data,
                        "file_id": payload.get("file_id"),
                        "file_name": payload.get("file_name"),
                        "file_size": payload.get("file_size"),
                        "mime_type": payload.get("mime_type"),
                        "download_url": payload.get("download_url"),
                    })

                    logger.debug(
                        "download_completed",
                        job_id=str(job_id),
                        file_name=payload.get("file_name"),
                        size=payload.get("file_size"),
                    )

        except Exception as e:
            logger.error("handle_download_completed_error", error=str(e))

    async def _handle_download_failed(self, msg) -> None:
        """Handle download failed event from file-svc."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_downloads:
                future = self._pending_downloads[job_id]
                if not future.done():
                    error_msg = payload.get("error_message") or payload.get("error", "Download failed")
                    future.set_result({
                        "success": False,
                        "error": error_msg,
                        "error_code": payload.get("error_code"),
                    })

                    logger.warning(
                        "download_failed",
                        job_id=str(job_id),
                        error=error_msg,
                    )

        except Exception as e:
            logger.error("handle_download_failed_error", error=str(e))

        except Exception as e:
            logger.error("handle_upload_failed_error", error=str(e))
