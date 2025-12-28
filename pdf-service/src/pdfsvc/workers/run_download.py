from __future__ import annotations

import asyncio

from pdfsvc.config.settings import Settings
from pdfsvc.container import Container
from pdfsvc.workers.download_worker import DownloadWorker


async def main() -> None:
    settings = Settings()
    container = Container(settings)

    (
        logger, redis, broker,
        tmp_store, qr_service, pdf_replace_service, pdf_qr_insert_service,
        job_repo, queue_repo, lock_repo,
        accept_batch_uc,
    ) = container.build()

    # start broker (needed to publish to file-gateway)
    await broker.start()
    logger.info("nats_connected", url=settings.NATS_URL)

    worker = DownloadWorker(
        broker=broker,
        jobs=job_repo,
        queues=queue_repo,
        locks=lock_repo,
        logger=logger,
        queue_name=settings.REDIS_QUEUE_PDF_DOWNLOAD,
        ttl_seconds=settings.REDIS_JOB_TTL_SECONDS,
    )

    await worker.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
