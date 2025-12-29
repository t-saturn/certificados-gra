"""
Event models for NATS communication.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    """Base event model with common fields."""

    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "pdf-svc"


# ============================================
# File Service Events (communication with file-svc)
# ============================================


class FileDownloadRequestPayload(BaseModel):
    """Payload for file download request."""

    job_id: UUID
    file_id: UUID
    destination_path: str


class FileDownloadRequest(BaseEvent):
    """Request to download a file from file-svc."""

    event_type: Literal["files.download.requested"] = "files.download.requested"
    payload: FileDownloadRequestPayload


class FileDownloadCompletedPayload(BaseModel):
    """Payload for file download completed event."""

    job_id: UUID
    file_id: UUID
    file_path: str
    file_name: str
    file_size: int
    mime_type: str


class FileDownloadCompleted(BaseEvent):
    """Event received when file download is completed."""

    event_type: Literal["files.download.completed"] = "files.download.completed"
    source: str = "file-svc"
    payload: FileDownloadCompletedPayload


class FileDownloadFailedPayload(BaseModel):
    """Payload for file download failed event."""

    job_id: UUID
    file_id: UUID
    error: str
    error_code: Optional[str] = None


class FileDownloadFailed(BaseEvent):
    """Event received when file download fails."""

    event_type: Literal["files.download.failed"] = "files.download.failed"
    source: str = "file-svc"
    payload: FileDownloadFailedPayload


class FileUploadRequestPayload(BaseModel):
    """Payload for file upload request."""

    job_id: UUID
    user_id: UUID
    file_path: str
    file_name: str
    is_public: bool = True
    mime_type: str = "application/pdf"


class FileUploadRequest(BaseEvent):
    """Request to upload a file to file-svc."""

    event_type: Literal["files.upload.requested"] = "files.upload.requested"
    payload: FileUploadRequestPayload


class FileUploadCompletedPayload(BaseModel):
    """Payload for file upload completed event."""

    job_id: UUID
    file_id: UUID
    file_name: str
    file_size: int
    file_hash: Optional[str] = None
    mime_type: str
    is_public: bool
    download_url: Optional[str] = None
    created_at: datetime


class FileUploadCompleted(BaseEvent):
    """Event received when file upload is completed."""

    event_type: Literal["files.upload.completed"] = "files.upload.completed"
    source: str = "file-svc"
    payload: FileUploadCompletedPayload


class FileUploadFailedPayload(BaseModel):
    """Payload for file upload failed event."""

    job_id: UUID
    error: str
    error_code: Optional[str] = None


class FileUploadFailed(BaseEvent):
    """Event received when file upload fails."""

    event_type: Literal["files.upload.failed"] = "files.upload.failed"
    source: str = "file-svc"
    payload: FileUploadFailedPayload


# ============================================
# PDF Service Events (this service)
# ============================================


class QrConfigItem(BaseModel):
    """QR configuration item."""

    base_url: Optional[str] = None
    verify_code: Optional[str] = None


class QrPdfConfigItem(BaseModel):
    """QR PDF insertion configuration item."""

    qr_size_cm: Optional[str] = None
    qr_margin_y_cm: Optional[str] = None
    qr_margin_x_cm: Optional[str] = None
    qr_page: Optional[str] = None
    qr_rect: Optional[str] = None


class PdfItem(BaseModel):
    """PDF placeholder replacement item."""

    key: str
    value: str


class PdfProcessRequestPayload(BaseModel):
    """Payload for PDF process request - single document."""

    template: UUID
    user_id: UUID
    serial_code: str
    is_public: bool = True
    qr: list[dict[str, str]] = Field(default_factory=list)
    qr_pdf: list[dict[str, str]] = Field(default_factory=list)
    pdf: list[dict[str, str]] = Field(default_factory=list)


class PdfProcessRequest(BaseEvent):
    """Request to process a PDF document."""

    event_type: Literal["pdf.process.requested"] = "pdf.process.requested"
    payload: PdfProcessRequestPayload


class PdfBatchProcessRequest(BaseEvent):
    """Request to process multiple PDF documents."""

    event_type: Literal["pdf.batch.requested"] = "pdf.batch.requested"
    payload: list[PdfProcessRequestPayload]


class PdfProcessCompletedPayload(BaseModel):
    """Payload for PDF process completed event."""

    pdf_job_id: UUID
    file_id: UUID
    file_name: str
    file_hash: Optional[str] = None
    file_size_bytes: int
    download_url: Optional[str] = None
    created_at: datetime
    processing_time_ms: int


class PdfProcessCompleted(BaseEvent):
    """Event emitted when PDF processing is completed."""

    event_type: Literal["pdf.process.completed"] = "pdf.process.completed"
    payload: PdfProcessCompletedPayload


class PdfProcessFailedPayload(BaseModel):
    """Payload for PDF process failed event."""

    pdf_job_id: UUID
    stage: str
    error: str
    error_code: Optional[str] = None
    details: Optional[dict[str, Any]] = None


class PdfProcessFailed(BaseEvent):
    """Event emitted when PDF processing fails."""

    event_type: Literal["pdf.process.failed"] = "pdf.process.failed"
    payload: PdfProcessFailedPayload


class PdfJobStatusPayload(BaseModel):
    """Payload for job status query response."""

    pdf_job_id: UUID
    status: str
    stage: Optional[str] = None
    progress_pct: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[PdfProcessCompletedPayload] = None
    error: Optional[PdfProcessFailedPayload] = None


class PdfJobStatusRequest(BaseEvent):
    """Request for job status."""

    event_type: Literal["pdf.job.status.requested"] = "pdf.job.status.requested"
    payload: dict[str, UUID]  # {"pdf_job_id": UUID}


class PdfJobStatusResponse(BaseEvent):
    """Response with job status."""

    event_type: Literal["pdf.job.status.response"] = "pdf.job.status.response"
    payload: PdfJobStatusPayload
