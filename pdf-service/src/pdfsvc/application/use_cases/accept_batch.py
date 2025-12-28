from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
from uuid import uuid4

import structlog

from pdfsvc.application.dto.requests import PdfBatchRequested
from pdfsvc.application.ports.job_repository import JobRepository
from pdfsvc.application.ports.queue_repository import QueueRepository


@dataclass(frozen=True)
class AcceptBatchUseCase:
    jobs: JobRepository
    queues: QueueRepository
    logger: structlog.BoundLogger
    ttl_seconds: int

    queue_download: str

    def execute(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        req = PdfBatchRequested.model_validate(payload)

        batch_id = f"pdfbatch_{uuid4().hex}"

        self.jobs.create_batch(
            batch_id,
            data={
                "status": "RUNNING",
                "total": str(len(req.items)),
                "completed": "0",
                "failed": "0",
                "request_id": req.request_id or "",
            },
            ttl_seconds=self.ttl_seconds,
        )

        jobs_out: List[Dict[str, Any]] = []

        for idx, item in enumerate(req.items):
            job_id = f"pdfjob_{uuid4().hex}"

            self.jobs.create_job(
                job_id,
                data={
                    "batch_id": batch_id,
                    "status": "CREATED",
                    "template_id": item.template_id,
                    "user_id": item.user_id,
                    "is_public": str(item.is_public),
                    "serial_code": item.serial_code,
                    "payload": item.model_dump_json(),  # keep original for later steps
                    "step": "download",
                },
                ttl_seconds=self.ttl_seconds,
            )

            # Enqueue first step: download
            self.queues.enqueue(
                self.queue_download,
                {
                    "pdf_batch_job_id": batch_id,
                    "pdf_item_job_id": job_id,
                },
            )

            jobs_out.append({"pdf_item_job_id": job_id, "status": "CREATED"})

        self.logger.info(
            "batch_accepted",
            pdf_batch_job_id=batch_id,
            jobs_count=len(jobs_out),
        )

        return {
            "request_id": req.request_id,
            "pdf_batch_job_id": batch_id,
            "jobs": jobs_out,
        }
