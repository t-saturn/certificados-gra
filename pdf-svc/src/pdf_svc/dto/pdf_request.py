"""
Data Transfer Objects for PDF processing requests and responses.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Request DTOs
# =============================================================================


class PdfPlaceholder(BaseModel):
    """Single placeholder replacement."""

    key: str
    value: str


class QrConfig(BaseModel):
    """QR code configuration from request."""

    base_url: str | None = None
    verify_code: str | None = None

    @classmethod
    def from_list(cls, items: list[dict[str, str]]) -> "QrConfig":
        """Build QrConfig from list of key-value dicts."""
        config = cls()
        for item in items:
            if "base_url" in item:
                config.base_url = item["base_url"]
            elif "verify_code" in item:
                config.verify_code = item["verify_code"]
        return config


class QrPdfConfig(BaseModel):
    """QR PDF insertion configuration."""

    qr_size_cm: float = 2.5
    qr_margin_y_cm: float = 1.0
    qr_page: int = 0
    qr_rect: tuple[float, float, float, float] | None = None

    @classmethod
    def from_list(cls, items: list[dict[str, str]]) -> "QrPdfConfig":
        """Build QrPdfConfig from list of key-value dicts."""
        config = cls()
        for item in items:
            if "qr_size_cm" in item:
                config.qr_size_cm = float(item["qr_size_cm"])
            elif "qr_margin_y_cm" in item:
                config.qr_margin_y_cm = float(item["qr_margin_y_cm"])
            elif "qr_page" in item:
                config.qr_page = int(item["qr_page"])
            elif "qr_rect" in item:
                # Parse "x0,y0,x1,y1" format
                parts = item["qr_rect"].split(",")
                if len(parts) == 4:
                    config.qr_rect = tuple(float(p) for p in parts)  # type: ignore
        return config


class BatchItemRequest(BaseModel):
    """Single item in a batch request."""

    user_id: UUID
    template_id: UUID
    serial_code: str
    is_public: bool = True
    pdf: list[dict[str, str]] = Field(default_factory=list)
    qr: list[dict[str, str]] = Field(default_factory=list)
    qr_pdf: list[dict[str, str]] = Field(default_factory=list)

    def get_placeholders(self) -> dict[str, str]:
        """Convert pdf items to placeholder dict."""
        result = {}
        for item in self.pdf:
            key = item.get("key", "").strip()
            value = item.get("value", "").strip()
            if key:
                result[f"{{{{{key}}}}}"] = value
        return result

    def get_qr_config(self) -> QrConfig:
        """Get QR configuration."""
        return QrConfig.from_list(self.qr)

    def get_qr_pdf_config(self) -> QrPdfConfig:
        """Get QR PDF configuration."""
        return QrPdfConfig.from_list(self.qr_pdf)


class BatchRequest(BaseModel):
    """Batch PDF processing request."""

    project_id: UUID | None = None
    items: list[BatchItemRequest]


# =============================================================================
# Response DTOs
# =============================================================================


class ItemDataResponse(BaseModel):
    """Data for a successfully processed item."""

    file_id: str
    original_name: str | None = None
    file_name: str
    file_size: int
    file_hash: str | None = None
    mime_type: str
    is_public: bool
    download_url: str
    created_at: str
    processing_time_ms: int | None = None


class ItemErrorResponse(BaseModel):
    """Error info for a failed item."""

    stage: str
    message: str
    code: str | None = None


class BatchItemResponse(BaseModel):
    """Response for a single item in batch."""

    item_id: str
    user_id: str
    serial_code: str
    status: str  # completed | failed
    data: ItemDataResponse | None = None
    error: ItemErrorResponse | None = None


class BatchResponse(BaseModel):
    """Response for batch processing."""

    job_id: str
    status: str  # completed | partial | failed
    total_items: int
    success_count: int
    failed_count: int
    items: list[BatchItemResponse]
    created_at: str
    completed_at: str | None = None
    processing_time_ms: int | None = None

    @classmethod
    def from_job(cls, job: Any) -> "BatchResponse":
        """Create response from BatchJob."""
        return cls(
            job_id=str(job.job_id),
            status=job.status.value,
            total_items=job.total_items,
            success_count=job.success_count,
            failed_count=job.failed_count,
            items=[
                BatchItemResponse(
                    item_id=str(item.item_id),
                    user_id=str(item.user_id),
                    serial_code=item.serial_code,
                    status=item.status.value,
                    data=ItemDataResponse(
                        file_id=str(item.data.file_id) if item.data and item.data.file_id else "",
                        original_name=item.data.original_name if item.data else None,
                        file_name=item.data.file_name or "" if item.data else "",
                        file_size=item.data.file_size or 0 if item.data else 0,
                        file_hash=item.data.file_hash if item.data else None,
                        mime_type=item.data.mime_type or "application/pdf" if item.data else "application/pdf",
                        is_public=item.data.is_public if item.data else True,
                        download_url=item.data.download_url or "" if item.data else "",
                        created_at=item.data.created_at.isoformat() if item.data and item.data.created_at else "",
                        processing_time_ms=item.data.processing_time_ms if item.data else None,
                    ) if item.data else None,
                    error=ItemErrorResponse(
                        stage=item.error.stage,
                        message=item.error.message,
                        code=item.error.code,
                    ) if item.error else None,
                )
                for item in job.items
            ],
            created_at=job.created_at.isoformat(),
            completed_at=job.completed_at.isoformat() if job.completed_at else None,
            processing_time_ms=job.processing_time_ms,
        )
