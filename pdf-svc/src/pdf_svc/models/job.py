"""
Job and Item models for batch PDF processing.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ItemStatus(str, Enum):
    """Status of individual item in batch."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    RENDERING = "rendering"
    RENDERED = "rendered"
    GENERATING_QR = "generating_qr"
    QR_GENERATED = "qr_generated"
    INSERTING_QR = "inserting_qr"
    QR_INSERTED = "qr_inserted"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


class JobStatus(str, Enum):
    """Status of the batch job."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIAL = "partial"  # Some items failed
    FAILED = "failed"  # All items failed


class ItemData(BaseModel):
    """Data returned for each processed item (from file-svc response)."""

    file_id: UUID | None = None
    original_name: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    file_hash: str | None = None
    mime_type: str | None = None
    is_public: bool = True
    download_url: str | None = None
    created_at: datetime | None = None
    processing_time_ms: int | None = None


class ItemError(BaseModel):
    """Error information for failed items - includes user_id, status, message."""

    user_id: UUID
    status: str = "failed"
    message: str
    stage: str | None = None
    code: str | None = None


class BatchItem(BaseModel):
    """Individual item in a batch processing job."""

    item_id: UUID = Field(default_factory=uuid4)
    user_id: UUID
    template_id: UUID
    serial_code: str
    is_public: bool = True

    # Processing configuration
    pdf_items: list[dict[str, str]] = Field(default_factory=list)
    qr_config: list[dict[str, str]] = Field(default_factory=list)
    qr_pdf_config: list[dict[str, str]] = Field(default_factory=list)

    # Status tracking
    status: ItemStatus = ItemStatus.PENDING
    progress_pct: int = 0

    # Result data (populated on completion)
    data: ItemData | None = None

    # Error info (populated on failure)
    error: ItemError | None = None

    # Timestamps
    started_at: datetime | None = None
    completed_at: datetime | None = None

    # Internal paths (not serialized to response)
    _template_path: str | None = None
    _output_path: str | None = None
    _qr_path: str | None = None

    def update_status(self, status: ItemStatus, progress: int | None = None) -> None:
        """Update item status and progress."""
        self.status = status
        if progress is not None:
            self.progress_pct = progress

        # Auto-set timestamps
        if status == ItemStatus.DOWNLOADING and self.started_at is None:
            self.started_at = datetime.now(timezone.utc)
        elif status in (ItemStatus.COMPLETED, ItemStatus.FAILED):
            self.completed_at = datetime.now(timezone.utc)

    def set_completed(self, data: ItemData) -> None:
        """Mark item as completed with result data."""
        self.status = ItemStatus.COMPLETED
        self.progress_pct = 100
        self.data = data
        self.completed_at = datetime.now(timezone.utc)

    def set_failed(self, stage: str, message: str, code: str | None = None) -> None:
        """Mark item as failed with error info including user_id."""
        self.status = ItemStatus.FAILED
        self.error = ItemError(
            user_id=self.user_id,
            status="failed",
            message=message,
            stage=stage,
            code=code,
        )
        self.completed_at = datetime.now(timezone.utc)

    def get_progress_for_status(self, status: ItemStatus) -> int:
        """Get progress percentage for a given status."""
        progress_map = {
            ItemStatus.PENDING: 0,
            ItemStatus.DOWNLOADING: 10,
            ItemStatus.DOWNLOADED: 20,
            ItemStatus.RENDERING: 30,
            ItemStatus.RENDERED: 50,
            ItemStatus.GENERATING_QR: 60,
            ItemStatus.QR_GENERATED: 70,
            ItemStatus.INSERTING_QR: 80,
            ItemStatus.QR_INSERTED: 85,
            ItemStatus.UPLOADING: 90,
            ItemStatus.COMPLETED: 100,
            ItemStatus.FAILED: self.progress_pct,  # Keep current
        }
        return progress_map.get(status, 0)

    def to_response(self) -> dict[str, Any]:
        """Convert item to response format."""
        result: dict[str, Any] = {
            "item_id": str(self.item_id),
            "user_id": str(self.user_id),
            "serial_code": self.serial_code,
            "status": self.status.value,
        }

        if self.status == ItemStatus.COMPLETED and self.data:
            result["data"] = {
                "file_id": str(self.data.file_id) if self.data.file_id else None,
                "file_name": self.data.file_name,
                "file_size": self.data.file_size,
                "file_hash": self.data.file_hash,
                "mime_type": self.data.mime_type,
                "is_public": self.data.is_public,
                "download_url": self.data.download_url,
                "created_at": self.data.created_at.isoformat() if self.data.created_at else None,
                "processing_time_ms": self.data.processing_time_ms,
            }
        elif self.status == ItemStatus.FAILED and self.error:
            result["error"] = {
                "user_id": str(self.error.user_id),
                "status": self.error.status,
                "message": self.error.message,
                "stage": self.error.stage,
                "code": self.error.code,
            }

        return result


class BatchJob(BaseModel):
    """Batch job containing multiple PDF processing items."""

    job_id: UUID = Field(default_factory=uuid4)
    pdf_job_id: UUID  # External job ID provided by caller

    # Items to process
    items: list[BatchItem] = Field(default_factory=list)

    # Job status
    status: JobStatus = JobStatus.PENDING
    total_items: int = 0
    success_count: int = 0
    failed_count: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    completed_at: datetime | None = None

    # Processing time
    processing_time_ms: int | None = None

    def add_item(self, item: BatchItem) -> None:
        """Add an item to the batch."""
        self.items.append(item)
        self.total_items = len(self.items)

    def start_processing(self) -> None:
        """Mark job as started."""
        self.status = JobStatus.PROCESSING
        self.started_at = datetime.now(timezone.utc)

    def update_counts(self) -> None:
        """Update success/failed counts based on item statuses."""
        self.success_count = sum(
            1 for item in self.items if item.status == ItemStatus.COMPLETED
        )
        self.failed_count = sum(
            1 for item in self.items if item.status == ItemStatus.FAILED
        )

    def finalize(self) -> None:
        """Finalize the job after all items are processed."""
        self.update_counts()
        self.completed_at = datetime.now(timezone.utc)

        # Calculate processing time
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.processing_time_ms = int(delta.total_seconds() * 1000)

        # Determine final status
        if self.failed_count == 0:
            self.status = JobStatus.COMPLETED
        elif self.success_count == 0:
            self.status = JobStatus.FAILED
        else:
            self.status = JobStatus.PARTIAL

    def get_item(self, item_id: UUID) -> BatchItem | None:
        """Get an item by ID."""
        for item in self.items:
            if item.item_id == item_id:
                return item
        return None

    def to_response(self) -> dict[str, Any]:
        """Convert to API response format."""
        return {
            "pdf_job_id": str(self.pdf_job_id),
            "job_id": str(self.job_id),
            "status": self.status.value,
            "total_items": self.total_items,
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "items": [item.to_response() for item in self.items],
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "processing_time_ms": self.processing_time_ms,
        }
