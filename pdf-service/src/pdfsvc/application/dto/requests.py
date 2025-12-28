from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PdfItemRequest(BaseModel):
    template_id: str
    user_id: str
    is_public: bool = True
    serial_code: str

    qr: List[Dict[str, Any]] = Field(default_factory=list)
    qr_pdf: List[Dict[str, Any]] = Field(default_factory=list)
    pdf: List[Dict[str, str]] = Field(default_factory=list)


class PdfBatchRequested(BaseModel):
    request_id: Optional[str] = None
    items: List[PdfItemRequest]
