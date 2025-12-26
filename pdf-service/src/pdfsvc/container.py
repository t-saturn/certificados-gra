from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from pdfsvc.config.settings import Settings
from pdfsvc.shared.logging import configure_logging

from pdfsvc.config.redis_connect import create_redis
from pdfsvc.config.nats_connect import create_broker

from pdfsvc.infrastructure.fs.tmp_store import TmpStore

from pdfsvc.domain.services.qr_service import QrService
from pdfsvc.domain.services.pdf_replace_service import PdfReplaceService
from pdfsvc.domain.services.pdf_qr_insert_service import PdfQrInsertService

from pdfsvc.infrastructure.redis.job_repo_redis import RedisJobRepository
from pdfsvc.infrastructure.redis.queue_repo_redis import RedisQueueRepository
from pdfsvc.infrastructure.redis.lock_repo_redis import RedisLockRepository

from pdfsvc.application.use_cases.accept_batch import AcceptBatchUseCase


@dataclass(frozen=True)
class Container:
    settings: Settings

    def build(self):
        # --- Logger ---
        logger = configure_logging(
            log_dir=self.settings.LOG_DIR,
            level=self.settings.LOG_LEVEL,
            service_name="pdf-service",
        )

        # --- Redis / NATS ---
        redis = create_redis(self.settings, logger)
        broker = create_broker(self.settings, logger)

        # ✅ --- Tmp Store (FIX: defines tmp_store) ---
        tmp_store = TmpStore.default()

        # --- Domain services ---
        qr_service = QrService(
            logo_path=Path(self.settings.QR_LOGO_PATH) if self.settings.QR_LOGO_PATH else None,
            logo_url=self.settings.QR_LOGO_URL,
            logo_cache_path=tmp_store.cached_logo_path(),
        )

        pdf_replace_service = PdfReplaceService()
        pdf_qr_insert_service = PdfQrInsertService()

        logger.info(
            "domain_services_ready",
            qr_logo_url=bool(self.settings.QR_LOGO_URL),
            qr_logo_path=self.settings.QR_LOGO_PATH,
            qr_logo_cache=str(tmp_store.cached_logo_path()),
        )

        # --- Repositories ---
        job_repo = RedisJobRepository(redis=redis, key_prefix=self.settings.REDIS_KEY_PREFIX)
        queue_repo = RedisQueueRepository(redis=redis)
        lock_repo = RedisLockRepository(redis=redis, key_prefix=self.settings.REDIS_KEY_PREFIX)

        # --- UseCases ---
        accept_batch_uc = AcceptBatchUseCase(
            jobs=job_repo,
            queues=queue_repo,
            logger=logger,
            ttl_seconds=self.settings.REDIS_JOB_TTL_SECONDS,
            queue_download=self.settings.REDIS_QUEUE_PDF_DOWNLOAD,
        )

        logger.info("container_built")

        return (
            logger,
            redis,
            broker,
            tmp_store,
            qr_service,
            pdf_replace_service,
            pdf_qr_insert_service,
            job_repo,
            queue_repo,
            lock_repo,
            accept_batch_uc,
        )
