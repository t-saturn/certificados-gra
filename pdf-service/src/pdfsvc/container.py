from __future__ import annotations

from dataclasses import dataclass

from pdfsvc.settings import Settings
from pdfsvc.logging import configure_logging
from pdfsvc.infrastructure.redis.redis_client import RedisClientFactory
from pdfsvc.infrastructure.nats.broker import create_broker


@dataclass(frozen=True)
class Container:
    settings: Settings

    def build(self):
        logger = configure_logging(
            log_dir=self.settings.LOG_DIR,
            log_file=self.settings.LOG_FILE,
            level=self.settings.LOG_LEVEL,
        )

        redis = RedisClientFactory(
            host=self.settings.REDIS_HOST,
            port=self.settings.REDIS_PORT,
            db=self.settings.REDIS_DB,
            password=self.settings.REDIS_PASSWORD,
        ).create()

        # test redis
        try:
            redis.ping()
            logger.info("redis_connected", host=self.settings.REDIS_HOST, port=self.settings.REDIS_PORT, db=self.settings.REDIS_DB)
        except Exception as e:
            logger.error("redis_connection_failed", error=str(e))
            raise

        broker = create_broker(self.settings.NATS_URL)

        logger.info("nats_configured", url=self.settings.NATS_URL)

        return logger, redis, broker
