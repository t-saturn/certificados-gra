from __future__ import annotations

import asyncio

from pdfsvc.config.settings import Settings
from pdfsvc.container import Container
from pdfsvc.infrastructure.nats.subscribers import register_subscribers


async def main() -> None:
    settings = Settings()
    container = Container(settings)
    (
        logger, redis, broker,
        tmp_store, qr_service, pdf_replace_service, pdf_qr_insert_service,
        job_repo, queue_repo, lock_repo,
        accept_batch_uc,
    ) = container.build() 

    register_subscribers(
        broker=broker,
        redis=redis,
        logger=logger,
        settings=settings,
        accept_batch_uc=accept_batch_uc,
    )


    logger.info("service_starting", service="pdf-service")

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


if __name__ == "__main__":
    asyncio.run(main())
