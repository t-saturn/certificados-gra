"""
File Repository - Communication with file-svc via NATS events.
"""

from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID, uuid4

import structlog
from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import Settings
from pdf_svc.models.events import (
    FileDownloadRequest,
    FileDownloadRequestPayload,
    FileUploadRequest,
    FileUploadRequestPayload,
)

logger = structlog.get_logger()


class FileRepository:
    """Repository for file operations via file-svc events."""

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

        # Pending operations tracking
        self._pending_downloads: dict[UUID, asyncio.Future] = {}
        self._pending_uploads: dict[UUID, asyncio.Future] = {}

        # Subscriptions
        self._download_completed_sub = None
        self._download_failed_sub = None
        self._upload_completed_sub = None
        self._upload_failed_sub = None

    async def start(self) -> None:
        """Start listening for file-svc events."""
        log = logger.bind(component="file_repository")

        # Subscribe to download events
        self._download_completed_sub = await self.nats.subscribe(
            self.settings.file_svc.download_completed_subject,
            cb=self._handle_download_completed,
        )
        self._download_failed_sub = await self.nats.subscribe(
            self.settings.file_svc.download_failed_subject,
            cb=self._handle_download_failed,
        )

        # Subscribe to upload events
        self._upload_completed_sub = await self.nats.subscribe(
            self.settings.file_svc.upload_completed_subject,
            cb=self._handle_upload_completed,
        )
        self._upload_failed_sub = await self.nats.subscribe(
            self.settings.file_svc.upload_failed_subject,
            cb=self._handle_upload_failed,
        )

        log.info(
            "file_repository_started",
            download_subject=self.settings.file_svc.download_completed_subject,
            upload_subject=self.settings.file_svc.upload_completed_subject,
        )

    async def stop(self) -> None:
        """Stop listening for events."""
        for sub in [
            self._download_completed_sub,
            self._download_failed_sub,
            self._upload_completed_sub,
            self._upload_failed_sub,
        ]:
            if sub:
                await sub.unsubscribe()

        # Cancel pending operations
        for future in list(self._pending_downloads.values()):
            if not future.done():
                future.cancel()
        for future in list(self._pending_uploads.values()):
            if not future.done():
                future.cancel()

        logger.info("file_repository_stopped")

    async def request_download(
        self,
        file_id: UUID,
        user_id: UUID,
        destination_path: str,
        project_id: UUID | None = None,
    ) -> UUID:
        """
        Request file download from file-svc.

        Args:
            file_id: ID of file to download
            user_id: User requesting download
            destination_path: Where to save the file
            project_id: Optional project ID

        Returns:
            Job ID for tracking
        """
        job_id = uuid4()
        log = logger.bind(job_id=str(job_id), file_id=str(file_id))

        event = FileDownloadRequest(
            payload=FileDownloadRequestPayload(
                job_id=job_id,
                file_id=file_id,
                user_id=user_id,
                project_id=project_id,
                destination_path=destination_path,
            )
        )

        await self.nats.publish(
            self.settings.file_svc.download_subject,
            event.model_dump_json().encode(),
        )

        log.debug("download_requested", subject=self.settings.file_svc.download_subject)
        return job_id

    async def download_and_wait(
        self,
        file_id: UUID,
        user_id: UUID,
        destination_path: str,
        project_id: UUID | None = None,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """
        Request download and wait for completion.

        Args:
            file_id: ID of file to download
            user_id: User requesting download
            destination_path: Where to save the file
            project_id: Optional project ID
            timeout: Override default timeout

        Returns:
            Result dict with success status and data
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
                    project_id=project_id,
                    destination_path=destination_path,
                )
            )

            await self.nats.publish(
                self.settings.file_svc.download_subject,
                event.model_dump_json().encode(),
            )

            log.debug("download_requested_waiting")

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

    async def request_upload(
        self,
        user_id: UUID,
        file_path: str,
        file_name: str,
        is_public: bool = True,
        project_id: UUID | None = None,
        mime_type: str = "application/pdf",
    ) -> UUID:
        """
        Request file upload to file-svc.

        Args:
            user_id: User uploading file
            file_path: Local path of file to upload
            file_name: Name for uploaded file
            is_public: Whether file is public
            project_id: Optional project ID
            mime_type: File MIME type

        Returns:
            Job ID for tracking
        """
        job_id = uuid4()
        log = logger.bind(job_id=str(job_id), file_name=file_name)

        event = FileUploadRequest(
            payload=FileUploadRequestPayload(
                job_id=job_id,
                user_id=user_id,
                project_id=project_id,
                file_path=file_path,
                file_name=file_name,
                is_public=is_public,
                mime_type=mime_type,
            )
        )

        await self.nats.publish(
            self.settings.file_svc.upload_subject,
            event.model_dump_json().encode(),
        )

        log.debug("upload_requested", subject=self.settings.file_svc.upload_subject)
        return job_id

    async def upload_and_wait(
        self,
        user_id: UUID,
        file_path: str,
        file_name: str,
        is_public: bool = True,
        project_id: UUID | None = None,
        mime_type: str = "application/pdf",
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """
        Request upload and wait for completion.

        Args:
            user_id: User uploading file
            file_path: Local path of file to upload
            file_name: Name for uploaded file
            is_public: Whether file is public
            project_id: Optional project ID
            mime_type: File MIME type
            timeout: Override default timeout

        Returns:
            Result dict with success status and data
        """
        job_id = uuid4()
        log = logger.bind(job_id=str(job_id), file_name=file_name)

        # Create future for result
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_uploads[job_id] = future

        try:
            # Publish request
            event = FileUploadRequest(
                payload=FileUploadRequestPayload(
                    job_id=job_id,
                    user_id=user_id,
                    project_id=project_id,
                    file_path=file_path,
                    file_name=file_name,
                    is_public=is_public,
                    mime_type=mime_type,
                )
            )

            await self.nats.publish(
                self.settings.file_svc.upload_subject,
                event.model_dump_json().encode(),
            )

            log.debug("upload_requested_waiting")

            # Wait for result
            result = await asyncio.wait_for(
                future,
                timeout=timeout or self.timeout,
            )

            return result

        except asyncio.TimeoutError:
            log.error("upload_timeout")
            return {"success": False, "error": "Upload timeout"}

        except Exception as e:
            log.error("upload_error", error=str(e))
            return {"success": False, "error": str(e)}

        finally:
            self._pending_uploads.pop(job_id, None)

    async def _handle_download_completed(self, msg) -> None:
        """Handle download completed event."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_downloads:
                future = self._pending_downloads[job_id]
                if not future.done():
                    future.set_result({
                        "success": True,
                        "file_id": payload.get("file_id"),
                        "file_path": payload.get("file_path"),
                        "file_name": payload.get("file_name"),
                        "file_size": payload.get("file_size"),
                        "mime_type": payload.get("mime_type"),
                    })

        except Exception as e:
            logger.error("handle_download_completed_error", error=str(e))

    async def _handle_download_failed(self, msg) -> None:
        """Handle download failed event."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_downloads:
                future = self._pending_downloads[job_id]
                if not future.done():
                    future.set_result({
                        "success": False,
                        "error": payload.get("error", "Download failed"),
                    })

        except Exception as e:
            logger.error("handle_download_failed_error", error=str(e))

    async def _handle_upload_completed(self, msg) -> None:
        """Handle upload completed event."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_uploads:
                future = self._pending_uploads[job_id]
                if not future.done():
                    future.set_result({
                        "success": True,
                        "file_id": UUID(payload.get("file_id")) if payload.get("file_id") else None,
                        "file_name": payload.get("file_name"),
                        "file_size": payload.get("file_size"),
                        "file_hash": payload.get("file_hash"),
                        "mime_type": payload.get("mime_type"),
                        "download_url": payload.get("download_url"),
                        "created_at": payload.get("created_at"),
                    })

        except Exception as e:
            logger.error("handle_upload_completed_error", error=str(e))

    async def _handle_upload_failed(self, msg) -> None:
        """Handle upload failed event."""
        import orjson

        try:
            data = orjson.loads(msg.data)
            payload = data.get("payload", {})
            job_id = UUID(payload.get("job_id"))

            if job_id in self._pending_uploads:
                future = self._pending_uploads[job_id]
                if not future.done():
                    future.set_result({
                        "success": False,
                        "error": payload.get("error", "Upload failed"),
                    })

        except Exception as e:
            logger.error("handle_upload_failed_error", error=str(e))
