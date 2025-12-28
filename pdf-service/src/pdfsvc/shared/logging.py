from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog


def configure_logging(
    *,
    log_dir: str,
    level: str = "info",
    service_name: str = "pdf-service",
) -> structlog.BoundLogger:
    """
    Console: pretty human logs
    File: JSON structured logs per day -> logs/YYYY-MM-DD.log
    """

    # Ensure dir exists
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    # Daily log file
    today = datetime.now().strftime("%Y-%m-%d")
    file_path = Path(log_dir) / f"{today}.log"

    lvl = getattr(logging, level.upper(), logging.INFO)

    # --- Python std logging handlers ---
    root_logger = logging.getLogger()
    root_logger.setLevel(lvl)

    # clear existing handlers (avoid duplicates with reload)
    root_logger.handlers.clear()

    # Console handler (pretty output)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(lvl)

    # File handler (JSON)
    file_handler = logging.FileHandler(file_path, encoding="utf-8")
    file_handler.setLevel(lvl)

    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # --- structlog processors ---
    shared_processors = [
        structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S"),
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Formatter for console (human)
    console_formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.dev.ConsoleRenderer(colors=True),
        foreign_pre_chain=shared_processors,
    )
    console_handler.setFormatter(console_formatter)

    # Formatter for file (json)
    file_formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
        foreign_pre_chain=shared_processors,
    )
    file_handler.setFormatter(file_formatter)

    logger = structlog.get_logger(service_name)
    cwd = Path.cwd()

    try:
        log_dir_rel = Path(log_dir).resolve().relative_to(cwd)
    except ValueError:
        log_dir_rel = Path(log_dir)

    try:
        log_file_rel = file_path.resolve().relative_to(cwd)
    except ValueError:
        log_file_rel = file_path

    logger.info(
        "logger_configured",
        log_dir=str(log_dir_rel),
        log_file=str(log_file_rel),
        level=level,
        service=service_name,
    )


    return logger
