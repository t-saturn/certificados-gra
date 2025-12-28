from __future__ import annotations

from redis import Redis
import structlog
from faststream.nats import NatsBroker

from pdfsvc.infrastructure.nats.subjects import PDF_BATCH_REQUESTED, PDF_BATCH_ACCEPTED


def register_subscribers(*, broker: NatsBroker, redis: Redis, logger: structlog.BoundLogger, settings, accept_batch_uc) -> None:
    @broker.subscriber(PDF_BATCH_REQUESTED)
    async def on_pdf_batch_requested(payload: dict):
        logger.info("event_received", subject=PDF_BATCH_REQUESTED)

        result = accept_batch_uc.execute(payload)

        await broker.publish(result, subject=PDF_BATCH_ACCEPTED)

        logger.info(
            "batch_accepted_published",
            subject=PDF_BATCH_ACCEPTED,
            pdf_batch_job_id=result["pdf_batch_job_id"],
            jobs=len(result["jobs"]),
        )
