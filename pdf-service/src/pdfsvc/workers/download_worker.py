from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

import structlog
from faststream.nats import NatsBroker

from pdfsvc.application.ports.job_repository import JobRepository
from pdfsvc.application.ports.queue_repository import QueueRepository
from pdfsvc.application.ports.lock_repository import LockRepository
from pdfsvc.infrastructure.nats.subjects import FILEGW_DOWNLOAD_REQUESTED


@dataclass(frozen=True)
class DownloadWorker:
    broker: NatsBroker
    jobs: JobRepository
    queues: QueueRepository
    locks: LockRepository
    logger: structlog.BoundLogger

    queue_name: str
    ttl_seconds: int

    async def run_forever(self) -> None:
        self.logger.info("worker_started", worker="download", queue=self.queue_name)

        while True:
            item = self.queues.dequeue_blocking(self.queue_name, timeout_seconds=5)
            if not item:
                continue

            await self.process(item)

    async def process(self, item: Dict[str, Any]) -> None:
        batch_id = item["pdf_batch_job_id"]
        job_id = item["pdf_item_job_id"]

        lock_key = f"{job_id}:download"
        if not self.locks.acquire(lock_key, ttl_seconds=60):
            self.logger.info("worker_skip_locked", job_id=job_id, step="download")
            return

        try:
            job = self.jobs.get_job(job_id)
            if not job:
                self.logger.warning("job_not_found", job_id=job_id)
                return

            # idempotency: if already requested or downloaded, skip
            status = job.get("status", "")
            if status in ("TEMPLATE_REQUESTED", "TEMPLATE_READY", "PDF_RENDERED", "COMPLETED"):
                self.logger.info("step_already_done", job_id=job_id, status=status, step="download")
                return

            template_id = job["template_id"]

            # update status
            self.jobs.update_job(job_id, {"status": "TEMPLATE_REQUESTED"}, ttl_seconds=self.ttl_seconds)

            await self.broker.publish(
                {
                    "correlation_id": job_id,
                    "file_id": template_id,
                    "purpose": "template",
                    "ttl_seconds": self.ttl_seconds,
                },
                subject=FILEGW_DOWNLOAD_REQUESTED,
            )

            self.logger.info("filegw_download_requested", job_id=job_id, template_id=template_id)

        finally:
            self.locks.release(lock_key)
