"""Data Transfer Objects module."""

from pdf_svc.dto.pdf_request import (
    PdfPlaceholder,
    PdfProcessDTO,
    PdfResultDTO,
    QrConfig,
    QrPdfConfig,
)

__all__ = [
    "PdfProcessDTO",
    "PdfResultDTO",
    "QrConfig",
    "QrPdfConfig",
    "PdfPlaceholder",
]
