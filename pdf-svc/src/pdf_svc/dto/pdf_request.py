"""
Data Transfer Objects for PDF processing.
"""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class QrConfig(BaseModel):
    """QR code generation configuration."""

    base_url: str
    verify_code: str

    @classmethod
    def from_list(cls, items: list[dict[str, str]]) -> "QrConfig":
        """Create QrConfig from list of key-value dicts."""
        merged = {}
        for item in items:
            merged.update(item)
        return cls(
            base_url=merged.get("base_url", ""),
            verify_code=merged.get("verify_code", ""),
        )


class QrPdfConfig(BaseModel):
    """QR insertion into PDF configuration."""

    qr_size_cm: float = 2.5
    qr_margin_y_cm: float = 1.0
    qr_margin_x_cm: float = 1.0
    qr_page: int = 0
    qr_rect: Optional[tuple[float, float, float, float]] = None

    @field_validator("qr_rect", mode="before")
    @classmethod
    def parse_rect(cls, v: str | tuple | None) -> Optional[tuple[float, float, float, float]]:
        if v is None:
            return None
        if isinstance(v, str):
            parts = [float(x.strip()) for x in v.split(",")]
            if len(parts) != 4:
                raise ValueError("qr_rect must have 4 values: x0,y0,x1,y1")
            return tuple(parts)  # type: ignore
        return v

    @classmethod
    def from_list(cls, items: list[dict[str, str]]) -> "QrPdfConfig":
        """Create QrPdfConfig from list of key-value dicts."""
        merged: dict[str, str] = {}
        for item in items:
            merged.update(item)

        return cls(
            qr_size_cm=float(merged.get("qr_size_cm", "2.5")),
            qr_margin_y_cm=float(merged.get("qr_margin_y_cm", "1.0")),
            qr_margin_x_cm=float(merged.get("qr_margin_x_cm", "1.0")),
            qr_page=int(merged.get("qr_page", "0")),
            qr_rect=merged.get("qr_rect"),
        )


class PdfPlaceholder(BaseModel):
    """PDF placeholder replacement item."""

    key: str
    value: str


class PdfProcessDTO(BaseModel):
    """DTO for PDF processing request."""

    template_id: UUID
    user_id: UUID
    serial_code: str
    is_public: bool = True
    qr_config: QrConfig
    qr_pdf_config: QrPdfConfig
    pdf_items: list[PdfPlaceholder]

    @classmethod
    def from_event_payload(
        cls,
        template: UUID,
        user_id: UUID,
        serial_code: str,
        is_public: bool,
        qr: list[dict[str, str]],
        qr_pdf: list[dict[str, str]],
        pdf: list[dict[str, str]],
    ) -> "PdfProcessDTO":
        """Create DTO from event payload fields."""
        return cls(
            template_id=template,
            user_id=user_id,
            serial_code=serial_code,
            is_public=is_public,
            qr_config=QrConfig.from_list(qr),
            qr_pdf_config=QrPdfConfig.from_list(qr_pdf),
            pdf_items=[PdfPlaceholder(**item) for item in pdf],
        )


class PdfResultDTO(BaseModel):
    """DTO for PDF processing result."""

    pdf_job_id: UUID
    file_id: UUID
    file_name: str
    file_hash: Optional[str] = None
    file_size_bytes: int
    download_url: Optional[str] = None
    created_at: str
    processing_time_ms: int
