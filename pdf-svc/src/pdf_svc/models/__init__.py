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
    JobStatusRequest,
    JobStatusRequestPayload,
    JobStatusResponse,
    JobStatusResponsePayload,
    PdfBatchCompleted,
    PdfBatchFailed,
    PdfBatchFailedPayload,
    PdfBatchRequest,
    PdfBatchRequestPayload,
    PdfBatchResultPayload,
    PdfItemCompleted,
    PdfItemCompletedPayload,
    PdfItemFailed,
    PdfItemFailedPayload,
    PdfItemRequest,
    PdfItemResult,
    PdfItemResultData,
    PdfItemResultError,
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
    # File-svc events (outbound - download only, upload uses HTTP)
    "FileDownloadRequestPayload",
    "FileDownloadRequest",
    # PDF-svc events (inbound)
    "PdfItemRequest",
    "PdfBatchRequestPayload",
    "PdfBatchRequest",
    # PDF-svc events (outbound)
    "PdfItemResult",
    "PdfItemResultData",
    "PdfItemResultError",
    "PdfBatchResultPayload",
    "PdfBatchCompleted",
    "PdfBatchFailed",
    "PdfBatchFailedPayload",
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
