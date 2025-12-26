from __future__ import annotations

from dataclasses import dataclass
import structlog

from pdfsvc.config.settings import Settings
from pdfsvc.config.redis_connect import create_redis
from pdfsvc.config.nats_connect import create_broker
from pdfsvc.shared.logging import configure_logging


@dataclass(frozen=True)
class Container:
    settings: Settings

    def build(self):
        logger = configure_logging(
            log_dir=self.settings.LOG_DIR,
            level=self.settings.LOG_LEVEL,
            service_name="pdf-service",
        )

        redis = create_redis(self.settings, logger)
        broker = create_broker(self.settings, logger)

        logger.info("container_built")
        return logger, redis, broker
