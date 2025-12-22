from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GenerateDocRequest(BaseModel):
    client_ref: Optional[str] = None
    template: str
    user_id: str
    is_public: bool = True

    qr: List[Dict[str, Any]] = Field(default_factory=list)
    qr_pdf: List[Dict[str, Any]] = Field(default_factory=list)
    pdf: List[Dict[str, str]] = Field(default_factory=list)


class GenerateDocItemResult(BaseModel):
    client_ref: Optional[str] = None
    user_id: str
    file_id: str
    verify_code: Optional[str] = None


class GenerateDocsResponse(BaseModel):
    message: str
    docs: List[GenerateDocItemResult] = Field(default_factory=list)
