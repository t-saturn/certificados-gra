from __future__ import annotations

from redis import Redis
import structlog
from faststream.nats import NatsBroker


def register_subscribers(*, broker: NatsBroker, redis: Redis, logger: structlog.BoundLogger, settings) -> None:
    @broker.subscriber("pdf.batch.requested")
    async def on_pdf_batch_requested(payload: dict):
        logger.info("event_received", subject="pdf.batch.requested", payload=payload)

        await broker.publish(
            {"message": "accepted", "jobs": []},
            subject="pdf.batch.accepted",
        )

        logger.info("event_published", subject="pdf.batch.accepted")
