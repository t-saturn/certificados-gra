from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class PdfBatchAccepted(BaseModel):
    request_id: Optional[str] = None
    pdf_batch_job_id: str
    jobs: List[Dict[str, Any]]


class PdfJobStatus(BaseModel):
    pdf_batch_job_id: str
    pdf_item_job_id: str
    status: str
    progress: int
    error: Optional[str] = None


class FileGwDownloadRequested(BaseModel):
    correlation_id: str
    file_id: str
    purpose: str = "template"
    ttl_seconds: int = 3600


class FileGwUploadRequested(BaseModel):
    correlation_id: str
    user_id: str
    is_public: bool
    filename: str
    tmp_path: str
    content_type: str = "application/pdf"
