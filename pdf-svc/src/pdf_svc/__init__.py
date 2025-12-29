"""
PDF Service - Event-driven PDF generator.

A microservice for generating PDFs with QR codes using NATS events.
"""

__version__ = "0.1.0"
__author__ = "Inteligente"

from pdf_svc.config import Settings, get_settings
from pdf_svc.services import (
    PdfOrchestrator,
    PdfQrInsertService,
    PdfReplaceService,
    QrService,
)

__all__ = [
    "__version__",
    "Settings",
    "get_settings",
    "QrService",
    "PdfReplaceService",
    "PdfQrInsertService",
    "PdfOrchestrator",
]
