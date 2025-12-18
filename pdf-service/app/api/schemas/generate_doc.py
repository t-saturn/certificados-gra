from __future__ import annotations

from typing import Any, Dict, List
from pydantic import BaseModel, Field


class GenerateDocRequest(BaseModel):
    template: str
    user_id: str
    is_public: bool = True

    qr: List[Dict[str, Any]] = Field(default_factory=list)
    qr_pdf: List[Dict[str, Any]] = Field(default_factory=list)
    pdf: List[Dict[str, str]] = Field(default_factory=list)
