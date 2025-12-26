from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import structlog


def configure_logging(*, log_dir: str, log_file: str, level: str = "info") -> structlog.BoundLogger:
    lvl = getattr(logging, level.upper(), logging.INFO)

    # Ensure log dir exists
    Path(log_dir).mkdir(parents=True, exist_ok=True)
    file_path = os.path.join(log_dir, log_file)

    # Standard logging handlers
    logging.basicConfig(
        level=lvl,
        format="%(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(file_path, encoding="utf-8"),
        ],
    )

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logger = structlog.get_logger("pdfsvc")
    logger.info("logger_configured", log_dir=log_dir, log_file=file_path, level=level)
    return logger
