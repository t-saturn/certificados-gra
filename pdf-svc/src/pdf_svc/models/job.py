"""
Job model for tracking PDF processing pipeline status.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Job status enum for pipeline stages."""

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


class JobStage(str, Enum):
    """Pipeline stages for job processing."""

    DOWNLOAD = "download"
    RENDER = "render"
    QR = "qr"
    INSERT = "insert"
    UPLOAD = "upload"


class JobError(BaseModel):
    """Error details for failed jobs."""

    stage: JobStage
    message: str
    details: Optional[dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JobResult(BaseModel):
    """Result details for completed jobs."""

    file_id: UUID
    file_name: str
    file_hash: Optional[str] = None
    file_size_bytes: int
    download_url: Optional[str] = None
    created_at: datetime


class Job(BaseModel):
    """
    Job model representing a PDF processing task.

    Tracks the entire pipeline from download to upload.
    """

    id: UUID = Field(default_factory=uuid4)
    status: JobStatus = JobStatus.PENDING
    stage: Optional[JobStage] = None

    # Request data
    template_id: UUID
    user_id: UUID
    serial_code: str
    is_public: bool = True

    # Processing data
    pdf_items: list[dict[str, str]] = Field(default_factory=list)
    qr_config: dict[str, str] = Field(default_factory=dict)
    qr_pdf_config: dict[str, str] = Field(default_factory=dict)

    # Temp file paths
    template_path: Optional[str] = None
    output_path: Optional[str] = None
    qr_path: Optional[str] = None

    # Result
    result: Optional[JobResult] = None
    error: Optional[JobError] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

    # Progress tracking
    progress_pct: int = 0

    def update_status(self, status: JobStatus, stage: Optional[JobStage] = None) -> None:
        """Update job status and timestamp."""
        self.status = status
        if stage:
            self.stage = stage
        self.updated_at = datetime.now(timezone.utc)

        # Update progress based on status
        progress_map = {
            JobStatus.PENDING: 0,
            JobStatus.DOWNLOADING: 10,
            JobStatus.DOWNLOADED: 20,
            JobStatus.RENDERING: 30,
            JobStatus.RENDERED: 50,
            JobStatus.GENERATING_QR: 60,
            JobStatus.QR_GENERATED: 70,
            JobStatus.INSERTING_QR: 80,
            JobStatus.QR_INSERTED: 85,
            JobStatus.UPLOADING: 90,
            JobStatus.COMPLETED: 100,
            JobStatus.FAILED: self.progress_pct,  # Keep current progress
        }
        self.progress_pct = progress_map.get(status, self.progress_pct)

        if status == JobStatus.COMPLETED:
            self.completed_at = datetime.now(timezone.utc)

    def set_error(self, stage: JobStage, message: str, details: Optional[dict] = None) -> None:
        """Set error details and mark job as failed."""
        self.error = JobError(stage=stage, message=message, details=details)
        self.update_status(JobStatus.FAILED, stage)

    def set_result(self, result: JobResult) -> None:
        """Set job result and mark as completed."""
        self.result = result
        self.update_status(JobStatus.COMPLETED)

    @property
    def is_complete(self) -> bool:
        return self.status == JobStatus.COMPLETED

    @property
    def is_failed(self) -> bool:
        return self.status == JobStatus.FAILED

    @property
    def is_processing(self) -> bool:
        return self.status not in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.PENDING)

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate job duration in seconds."""
        if self.completed_at:
            return (self.completed_at - self.created_at).total_seconds()
        return None

    class Config:
        use_enum_values = True
