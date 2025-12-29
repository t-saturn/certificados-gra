"""
File repository for communication with file-svc via events.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional
from uuid import UUID

from nats.aio.client import Client as NatsClient

from pdf_svc.config.settings import get_settings
from pdf_svc.models.events import (
    FileDownloadCompleted,
    FileDownloadFailed,
    FileDownloadRequest,
    FileDownloadRequestPayload,
    FileUploadCompleted,
    FileUploadFailed,
    FileUploadRequest,
    FileUploadRequestPayload,
)
from pdf_svc.shared.logger import get_logger

logger = get_logger(__name__)


class FileRepository:
    """
    Repository for file operations via NATS events.

    Communicates with file-svc for upload/download operations.
    """

    def __init__(
        self,
        nats_client: NatsClient,
        download_subject: str = "files.download.requested",
        upload_subject: str = "files.upload.requested",
        timeout_seconds: float = 30.0,
    ):
        self._nats = nats_client
        self._download_subject = download_subject
        self._upload_subject = upload_subject
        self._timeout = timeout_seconds

        # Pending operations tracking
        self._pending_downloads: dict[UUID, asyncio.Future] = {}
        self._pending_uploads: dict[UUID, asyncio.Future] = {}

    async def request_download(
        self,
        job_id: UUID,
        file_id: UUID,
        destination_path: Path,
    ) -> None:
        """
        Request file download from file-svc.

        Args:
            job_id: Job ID for tracking
            file_id: File ID to download
            destination_path: Where to save the file
        """
        event = FileDownloadRequest(
            payload=FileDownloadRequestPayload(
                job_id=job_id,
                file_id=file_id,
                destination_path=str(destination_path),
            )
        )

        data = event.model_dump_json().encode()
        await self._nats.publish(self._download_subject, data)

        logger.info(
            "download_requested",
            job_id=str(job_id),
            file_id=str(file_id),
            subject=self._download_subject,
        )

    async def request_upload(
        self,
        job_id: UUID,
        user_id: UUID,
        file_path: Path,
        file_name: str,
        is_public: bool = True,
    ) -> None:
        """
        Request file upload to file-svc.

        Args:
            job_id: Job ID for tracking
            user_id: User ID for ownership
            file_path: Path to file to upload
            file_name: Name for the uploaded file
            is_public: Whether file should be public
        """
        event = FileUploadRequest(
            payload=FileUploadRequestPayload(
                job_id=job_id,
                user_id=user_id,
                file_path=str(file_path),
                file_name=file_name,
                is_public=is_public,
                mime_type="application/pdf",
            )
        )

        data = event.model_dump_json().encode()
        await self._nats.publish(self._upload_subject, data)

        logger.info(
            "upload_requested",
            job_id=str(job_id),
            file_name=file_name,
            subject=self._upload_subject,
        )

    def register_download_future(self, job_id: UUID) -> asyncio.Future:
        """Register a future to wait for download completion."""
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_downloads[job_id] = future
        return future

    def register_upload_future(self, job_id: UUID) -> asyncio.Future:
        """Register a future to wait for upload completion."""
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending_uploads[job_id] = future
        return future

    def resolve_download(
        self, job_id: UUID, result: FileDownloadCompleted | FileDownloadFailed
    ) -> None:
        """Resolve pending download future."""
        future = self._pending_downloads.pop(job_id, None)
        if future and not future.done():
            if isinstance(result, FileDownloadFailed):
                future.set_exception(Exception(result.payload.error))
            else:
                future.set_result(result.payload)

    def resolve_upload(
        self, job_id: UUID, result: FileUploadCompleted | FileUploadFailed
    ) -> None:
        """Resolve pending upload future."""
        future = self._pending_uploads.pop(job_id, None)
        if future and not future.done():
            if isinstance(result, FileUploadFailed):
                future.set_exception(Exception(result.payload.error))
            else:
                future.set_result(result.payload)

    async def download_and_wait(
        self,
        job_id: UUID,
        file_id: UUID,
        destination_path: Path,
    ) -> FileDownloadCompleted:
        """
        Request download and wait for completion.

        Args:
            job_id: Job ID for tracking
            file_id: File ID to download
            destination_path: Where to save the file

        Returns:
            Download completed event

        Raises:
            TimeoutError: If download times out
            Exception: If download fails
        """
        future = self.register_download_future(job_id)
        await self.request_download(job_id, file_id, destination_path)

        try:
            result = await asyncio.wait_for(future, timeout=self._timeout)
            return result
        except asyncio.TimeoutError:
            self._pending_downloads.pop(job_id, None)
            raise TimeoutError(f"Download timeout for file {file_id}")

    async def upload_and_wait(
        self,
        job_id: UUID,
        user_id: UUID,
        file_path: Path,
        file_name: str,
        is_public: bool = True,
    ) -> FileUploadCompleted:
        """
        Request upload and wait for completion.

        Args:
            job_id: Job ID for tracking
            user_id: User ID for ownership
            file_path: Path to file to upload
            file_name: Name for the uploaded file
            is_public: Whether file should be public

        Returns:
            Upload completed event

        Raises:
            TimeoutError: If upload times out
            Exception: If upload fails
        """
        future = self.register_upload_future(job_id)
        await self.request_upload(job_id, user_id, file_path, file_name, is_public)

        try:
            result = await asyncio.wait_for(future, timeout=self._timeout)
            return result
        except asyncio.TimeoutError:
            self._pending_uploads.pop(job_id, None)
            raise TimeoutError(f"Upload timeout for file {file_name}")


def create_file_repository(nats_client: NatsClient) -> FileRepository:
    """Factory function to create file repository."""
    settings = get_settings()
    return FileRepository(
        nats_client=nats_client,
        download_subject=settings.file_svc.download_subject,
        upload_subject=settings.file_svc.upload_subject,
    )
