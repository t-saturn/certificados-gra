from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import structlog

from app.core.config import Settings


def _daily_log_path(log_dir: Path) -> Path:
    return log_dir / f"{datetime.now().date().isoformat()}.log"


def _level(settings: Settings) -> int:
    return getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)


def setup_logging(settings: Settings) -> None:
    log_dir = settings.log_dir_path
    log_dir.mkdir(parents=True, exist_ok=True)

    level = _level(settings)
    log_file = _daily_log_path(log_dir)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    # File handler: always plain lines (JSON produced by structlog)
    fh = logging.FileHandler(str(log_file), encoding="utf-8")
    fh.setLevel(level)
    fh.setFormatter(logging.Formatter("%(message)s"))
    root.addHandler(fh)

    # Console handler: Rich in dev, plain otherwise
    if settings.ENV.lower() == "dev":
        from rich.logging import RichHandler
        ch = RichHandler(
            rich_tracebacks=True,
            show_time=True,
            show_level=True,
            show_path=False,
            markup=True,
        )
        ch.setLevel(level)
        ch.setFormatter(logging.Formatter("%(message)s"))
    else:
        ch = logging.StreamHandler()
        ch.setLevel(level)
        ch.setFormatter(logging.Formatter("%(message)s"))

    root.addHandler(ch)

    # Uvicorn -> root handlers
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True
        logger.setLevel(level)

    # Structlog: ALWAYS JSON (no ANSI codes)
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if settings.LOG_JSON else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
