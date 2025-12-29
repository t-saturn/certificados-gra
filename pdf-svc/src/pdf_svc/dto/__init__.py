"""Data Transfer Objects module."""

from pdf_svc.dto.pdf_request import (
    BatchItemRequest,
    BatchItemResponse,
    BatchRequest,
    BatchResponse,
    ItemDataResponse,
    ItemErrorResponse,
    PdfPlaceholder,
    QrConfig,
    QrPdfConfig,
)

__all__ = [
    "BatchItemRequest",
    "BatchRequest",
    "BatchResponse",
    "BatchItemResponse",
    "ItemDataResponse",
    "ItemErrorResponse",
    "PdfPlaceholder",
    "QrConfig",
    "QrPdfConfig",
]
