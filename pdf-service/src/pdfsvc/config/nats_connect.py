from __future__ import annotations

import structlog
from faststream.nats import NatsBroker

from pdfsvc.config.settings import Settings


def create_broker(settings: Settings, logger: structlog.BoundLogger) -> NatsBroker:
    broker = NatsBroker(settings.NATS_URL)
    logger.info("nats_configured", url=settings.NATS_URL)
    return broker
