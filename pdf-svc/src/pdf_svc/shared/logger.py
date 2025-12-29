"""
Structured logging configuration using structlog.
Provides colored console output and file logging.
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import structlog
from structlog.dev import ConsoleRenderer
from structlog.processors import JSONRenderer
from structlog.typing import EventDict, WrappedLogger

from pdf_svc.config.settings import get_settings


def _add_timestamp(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add ISO timestamp to log event."""
    event_dict["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    return event_dict


def _add_service_name(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Add service name to log event."""
    event_dict["service"] = "pdf-svc"
    return event_dict


def _extract_from_record(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Extract useful info from stdlib LogRecord if present."""
    record = event_dict.get("_record")
    if record is not None:
        event_dict["logger"] = record.name
        if record.exc_info:
            event_dict["exc_info"] = record.exc_info
    return event_dict


def _order_keys(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Order keys for consistent output."""
    key_order = ["timestamp", "level", "event", "service", "logger"]
    ordered: dict[str, Any] = {}

    for key in key_order:
        if key in event_dict:
            ordered[key] = event_dict.pop(key)

    ordered.update(sorted(event_dict.items()))
    return ordered


class DailyFileHandler(logging.FileHandler):
    """File handler that creates daily log files."""

    def __init__(self, log_dir: Path, base_name: str = "pdf-service"):
        self.log_dir = log_dir
        self.base_name = base_name
        self._current_date: str | None = None
        log_dir.mkdir(parents=True, exist_ok=True)
        super().__init__(self._get_log_path(), encoding="utf-8")

    def _get_log_path(self) -> Path:
        today = datetime.now().strftime("%Y-%m-%d")
        return self.log_dir / f"{today}.log"

    def emit(self, record: logging.LogRecord) -> None:
        today = datetime.now().strftime("%Y-%m-%d")
        if self._current_date != today:
            self._current_date = today
            self.close()
            self.baseFilename = str(self._get_log_path())
            self.stream = self._open()
        super().emit(record)


def configure_logging(
    level: Literal["debug", "info", "warning", "error", "critical"] = "info",
    log_format: Literal["console", "json"] = "console",
    log_dir: Path | None = None,
) -> None:
    """
    Configure structlog with colored console output and file logging.

    Args:
        level: Log level (debug, info, warning, error, critical)
        log_format: Output format (console for dev, json for prod)
        log_dir: Directory for log files (creates daily files)
    """
    settings = get_settings()
    log_dir = log_dir or settings.log.dir
    log_dir.mkdir(parents=True, exist_ok=True)

    # Map string level to logging constant
    level_map = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
        "critical": logging.CRITICAL,
    }
    numeric_level = level_map.get(level.lower(), logging.INFO)

    # Shared processors for all outputs
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        _add_timestamp,
        _add_service_name,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # Configure structlog
    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Console renderer (colored)
    console_renderer = ConsoleRenderer(
        colors=True,
        exception_formatter=structlog.dev.rich_traceback
        if log_format == "console"
        else structlog.dev.plain_traceback,
        pad_event=35,
        sort_keys=False,
    )

    # JSON renderer for file/production
    json_renderer = JSONRenderer(indent=None, sort_keys=True)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            _extract_from_record,
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            console_renderer,
        ],
    )
    console_handler.setFormatter(console_formatter)

    # File handler (daily files with JSON format)
    file_handler = DailyFileHandler(log_dir)
    file_handler.setLevel(numeric_level)
    file_formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            _extract_from_record,
            _order_keys,
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            json_renderer,
        ],
    )
    file_handler.setFormatter(file_formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.setLevel(numeric_level)

    # Silence noisy loggers
    for logger_name in ["asyncio", "httpx", "httpcore", "nats", "redis"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured structlog BoundLogger
    """
    return structlog.get_logger(name)


# Convenience alias
logger = get_logger("pdf_svc")
