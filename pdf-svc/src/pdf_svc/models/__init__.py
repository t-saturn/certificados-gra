"""Models package."""

from pdf_svc.models.events import (
    BaseEvent,
    FileDownloadCompleted,
    FileDownloadFailed,
    FileDownloadPayload,
    FileDownloadRequest,
    FileDownloadRequestPayload,
    FileUploadCompleted,
    FileUploadFailed,
    FileUploadPayload,
    FileUploadRequest,
    FileUploadRequestPayload,
    JobStatusRequest,
    JobStatusRequestPayload,
    JobStatusResponse,
    JobStatusResponsePayload,
    PdfBatchCompleted,
    PdfBatchFailed,
    PdfBatchRequest,
    PdfBatchRequestPayload,
    PdfBatchResultPayload,
    PdfItemCompleted,
    PdfItemCompletedPayload,
    PdfItemFailed,
    PdfItemFailedPayload,
    PdfItemRequest,
    PdfItemResult,
)
from pdf_svc.models.job import (
    BatchItem,
    BatchJob,
    ItemData,
    ItemError,
    ItemStatus,
    JobStatus,
)

__all__ = [
    # Job models
    "BatchJob",
    "BatchItem",
    "ItemData",
    "ItemError",
    "ItemStatus",
    "JobStatus",
    # Base event
    "BaseEvent",
    # File-svc events (inbound)
    "FileDownloadPayload",
    "FileDownloadCompleted",
    "FileDownloadFailed",
    "FileUploadPayload",
    "FileUploadCompleted",
    "FileUploadFailed",
    # File-svc events (outbound)
    "FileDownloadRequestPayload",
    "FileDownloadRequest",
    "FileUploadRequestPayload",
    "FileUploadRequest",
    # PDF-svc events (inbound)
    "PdfItemRequest",
    "PdfBatchRequestPayload",
    "PdfBatchRequest",
    # PDF-svc events (outbound)
    "PdfItemResult",
    "PdfBatchResultPayload",
    "PdfBatchCompleted",
    "PdfBatchFailed",
    "PdfItemCompletedPayload",
    "PdfItemCompleted",
    "PdfItemFailedPayload",
    "PdfItemFailed",
    # Job status events
    "JobStatusRequestPayload",
    "JobStatusRequest",
    "JobStatusResponsePayload",
    "JobStatusResponse",
]
