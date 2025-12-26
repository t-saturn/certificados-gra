from __future__ import annotations

import asyncio

from pdfsvc.settings import Settings
from pdfsvc.container import Container
from pdfsvc.infrastructure.nats.subscribers import register_subscribers


async def main() -> None:
    settings = Settings()
    container = Container(settings)
    logger, redis, broker = container.build()

    register_subscribers(broker=broker, redis=redis, logger=logger, settings=settings)

    logger.info("service_starting", service="pdf-service")

    # Start broker
    await broker.start()
    logger.info("nats_connected", url=settings.NATS_URL)
    logger.info("service_started", service="pdf-service", mode="event-driven")

    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        logger.info("service_stopping", service="pdf-service")
    finally:
        await broker.close()
        logger.info("service_stopped", service="pdf-service")
