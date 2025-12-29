"""
NATS event models for pdf-svc and file-svc communication.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# =============================================================================
# Base Event
# =============================================================================


class BaseEvent(BaseModel):
    """Base event structure matching file-svc format."""

    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "pdf-svc"


# =============================================================================
# File-svc Events (Inbound)
# =============================================================================


class FileDownloadPayload(BaseModel):
    """Payload for file download events."""

    job_id: UUID
    file_id: UUID
    user_id: UUID | None = None
    file_name: str | None = None
    file_path: str | None = None  # Local path where file was downloaded
    file_size: int | None = None
    mime_type: str | None = None
    error: str | None = None


class FileDownloadCompleted(BaseEvent):
    """Event received when file-svc completes a download."""

    event_type: str = "files.download.completed"
    payload: FileDownloadPayload


class FileDownloadFailed(BaseEvent):
    """Event received when file-svc fails a download."""

    event_type: str = "files.download.failed"
    payload: FileDownloadPayload


class FileUploadPayload(BaseModel):
    """Payload for file upload events."""

    job_id: UUID
    file_id: UUID | None = None
    user_id: UUID | None = None
    file_name: str | None = None
    file_size: int | None = None
    file_hash: str | None = None
    mime_type: str | None = None
    is_public: bool = True
    download_url: str | None = None
    created_at: datetime | None = None
    error: str | None = None


class FileUploadCompleted(BaseEvent):
    """Event received when file-svc completes an upload."""

    event_type: str = "files.upload.completed"
    payload: FileUploadPayload


class FileUploadFailed(BaseEvent):
    """Event received when file-svc fails an upload."""

    event_type: str = "files.upload.failed"
    payload: FileUploadPayload


# =============================================================================
# File-svc Events (Outbound - Requests)
# =============================================================================


class FileDownloadRequestPayload(BaseModel):
    """Payload for requesting file download."""

    job_id: UUID
    file_id: UUID
    user_id: UUID | None = None
    destination_path: str  # Where to save the file


class FileDownloadRequest(BaseEvent):
    """Event to request file download from file-svc."""

    event_type: str = "files.download.requested"
    payload: FileDownloadRequestPayload


class FileUploadRequestPayload(BaseModel):
    """Payload for requesting file upload."""

    job_id: UUID
    user_id: UUID
    file_path: str  # Local path of file to upload
    file_name: str
    is_public: bool = True
    mime_type: str = "application/pdf"


class FileUploadRequest(BaseEvent):
    """Event to request file upload to file-svc."""

    event_type: str = "files.upload.requested"
    payload: FileUploadRequestPayload


# =============================================================================
# PDF-svc Events (Inbound - Requests)
# =============================================================================


class PdfItemRequest(BaseModel):
    """Single item in a batch processing request."""

    user_id: UUID
    template_id: UUID
    serial_code: str
    is_public: bool = True
    pdf: list[dict[str, str]] = Field(default_factory=list)
    qr: list[dict[str, str]] = Field(default_factory=list)
    qr_pdf: list[dict[str, str]] = Field(default_factory=list)


class PdfBatchRequestPayload(BaseModel):
    """Payload for batch PDF processing request."""

    pdf_job_id: UUID  # External job ID provided by caller
    items: list[PdfItemRequest]


class PdfBatchRequest(BaseEvent):
    """Event to request batch PDF processing."""

    event_type: str = "pdf.batch.requested"
    payload: PdfBatchRequestPayload


# =============================================================================
# PDF-svc Events (Outbound - Responses)
# =============================================================================


class PdfItemResultData(BaseModel):
    """Success data for a processed item."""

    file_id: UUID | None = None
    file_name: str | None = None
    file_size: int | None = None
    file_hash: str | None = None
    mime_type: str = "application/pdf"
    is_public: bool = True
    download_url: str | None = None
    created_at: datetime | None = None
    processing_time_ms: int | None = None


class PdfItemResultError(BaseModel):
    """Error info for a failed item - includes user_id, status, message."""

    user_id: UUID
    status: str  # failed
    message: str
    stage: str | None = None
    code: str | None = None


class PdfItemResult(BaseModel):
    """Result of a single item processing."""

    item_id: UUID
    user_id: UUID
    serial_code: str
    status: str  # completed | failed
    data: PdfItemResultData | None = None
    error: PdfItemResultError | None = None


class PdfBatchResultPayload(BaseModel):
    """Payload for batch processing result."""

    pdf_job_id: UUID  # External job ID (from request)
    job_id: UUID  # Internal job ID (generated by pdf-svc)
    status: str  # completed | partial | failed
    total_items: int
    success_count: int
    failed_count: int
    items: list[PdfItemResult]
    processing_time_ms: int | None = None


class PdfBatchCompleted(BaseEvent):
    """Event published when batch processing completes."""

    event_type: str = "pdf.batch.completed"
    payload: PdfBatchResultPayload


class PdfBatchFailedPayload(BaseModel):
    """Payload for batch failure."""

    pdf_job_id: UUID | None = None
    job_id: UUID | None = None
    status: str = "failed"
    message: str
    code: str | None = None


class PdfBatchFailed(BaseEvent):
    """Event published when entire batch fails (e.g., validation error)."""

    event_type: str = "pdf.batch.failed"
    payload: PdfBatchFailedPayload


class PdfItemCompletedPayload(BaseModel):
    """Payload for individual item completion."""

    pdf_job_id: UUID
    job_id: UUID
    item_id: UUID
    user_id: UUID
    serial_code: str
    status: str = "completed"
    data: PdfItemResultData


class PdfItemCompleted(BaseEvent):
    """Event published when a single item completes (for real-time tracking)."""

    event_type: str = "pdf.item.completed"
    payload: PdfItemCompletedPayload


class PdfItemFailedPayload(BaseModel):
    """Payload for individual item failure."""

    pdf_job_id: UUID
    job_id: UUID
    item_id: UUID
    user_id: UUID
    serial_code: str
    status: str = "failed"
    message: str
    stage: str | None = None
    code: str | None = None


class PdfItemFailed(BaseEvent):
    """Event published when a single item fails."""

    event_type: str = "pdf.item.failed"
    payload: PdfItemFailedPayload


# =============================================================================
# Job Status Query Events
# =============================================================================


class JobStatusRequestPayload(BaseModel):
    """Payload for job status request."""

    job_id: UUID  # Can be pdf_job_id or internal job_id


class JobStatusRequest(BaseEvent):
    """Event to request job status."""

    event_type: str = "pdf.job.status.requested"
    payload: JobStatusRequestPayload


class JobStatusResponsePayload(BaseModel):
    """Payload for job status response."""

    pdf_job_id: UUID
    job_id: UUID
    status: str
    total_items: int
    success_count: int
    failed_count: int
    items: list[dict[str, Any]]
    created_at: str
    completed_at: str | None = None
    processing_time_ms: int | None = None


class JobStatusResponse(BaseEvent):
    """Event response with job status."""

    event_type: str = "pdf.job.status.response"
    payload: JobStatusResponsePayload
