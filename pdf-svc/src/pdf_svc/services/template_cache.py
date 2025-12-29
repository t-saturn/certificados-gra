"""
Template Cache Service.

Caches downloaded templates by template_id to avoid repeated downloads.
Templates are stored in memory and on disk with a 1-day TTL.
"""

from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING
from uuid import UUID

import structlog

if TYPE_CHECKING:
    from pdf_svc.repositories.file_repository import FileRepository

logger = structlog.get_logger()

# Cache TTL: 1 day in seconds
CACHE_TTL_SECONDS = 24 * 60 * 60  # 86400 seconds = 1 day


@dataclass
class CachedTemplate:
    """Cached template data."""

    template_id: UUID
    data: bytes
    file_name: str | None
    cached_at: float  # Unix timestamp
    file_size: int

    @property
    def is_expired(self) -> bool:
        """Check if cache entry is expired."""
        return (time.time() - self.cached_at) > CACHE_TTL_SECONDS

    @property
    def age_seconds(self) -> float:
        """Get age in seconds."""
        return time.time() - self.cached_at


class TemplateCache:
    """
    Template cache with memory + disk backing.
    
    - First checks memory cache
    - Then checks disk cache
    - Finally downloads from file-svc
    
    TTL: 1 day
    """

    def __init__(
        self,
        file_repository: "FileRepository",
        cache_dir: str = "./cache/templates",
    ) -> None:
        """
        Initialize template cache.

        Args:
            file_repository: Repository for downloading files
            cache_dir: Directory to store cached templates
        """
        self.file_repository = file_repository
        self.cache_dir = Path(cache_dir).resolve()
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # In-memory cache: template_id -> CachedTemplate
        self._memory_cache: dict[UUID, CachedTemplate] = {}
        
        # Lock for thread-safe operations
        self._locks: dict[UUID, asyncio.Lock] = {}

        logger.info(
            "template_cache_initialized",
            cache_dir=str(self.cache_dir),
            ttl_seconds=CACHE_TTL_SECONDS,
        )

    def _get_lock(self, template_id: UUID) -> asyncio.Lock:
        """Get or create lock for template_id."""
        if template_id not in self._locks:
            self._locks[template_id] = asyncio.Lock()
        return self._locks[template_id]

    def _get_disk_path(self, template_id: UUID) -> Path:
        """Get disk cache path for template."""
        return self.cache_dir / f"{template_id}.pdf"

    def _load_from_disk(self, template_id: UUID) -> CachedTemplate | None:
        """Load template from disk cache."""
        disk_path = self._get_disk_path(template_id)
        
        if not disk_path.exists():
            return None

        try:
            # Check file modification time for TTL
            mtime = disk_path.stat().st_mtime
            age = time.time() - mtime
            
            if age > CACHE_TTL_SECONDS:
                logger.debug(
                    "disk_cache_expired",
                    template_id=str(template_id),
                    age_hours=age / 3600,
                )
                # Delete expired file
                disk_path.unlink(missing_ok=True)
                return None

            # Load from disk
            data = disk_path.read_bytes()
            
            cached = CachedTemplate(
                template_id=template_id,
                data=data,
                file_name=f"{template_id}.pdf",
                cached_at=mtime,
                file_size=len(data),
            )

            logger.debug(
                "disk_cache_hit",
                template_id=str(template_id),
                size=len(data),
                age_hours=age / 3600,
            )

            return cached

        except Exception as e:
            logger.warning(
                "disk_cache_load_error",
                template_id=str(template_id),
                error=str(e),
            )
            return None

    def _save_to_disk(self, template_id: UUID, data: bytes) -> None:
        """Save template to disk cache."""
        disk_path = self._get_disk_path(template_id)
        
        try:
            disk_path.write_bytes(data)
            logger.debug(
                "disk_cache_saved",
                template_id=str(template_id),
                size=len(data),
            )
        except Exception as e:
            logger.warning(
                "disk_cache_save_error",
                template_id=str(template_id),
                error=str(e),
            )

    async def get_template(
        self,
        template_id: UUID,
        user_id: UUID,
    ) -> bytes:
        """
        Get template bytes, using cache if available.

        Flow:
        1. Check memory cache
        2. Check disk cache
        3. Download from file-svc

        Args:
            template_id: ID of template to get
            user_id: User ID for download request

        Returns:
            Template PDF bytes

        Raises:
            RuntimeError: If download fails
        """
        log = logger.bind(template_id=str(template_id))

        # Use lock to prevent concurrent downloads of same template
        async with self._get_lock(template_id):
            # 1. Check memory cache
            if template_id in self._memory_cache:
                cached = self._memory_cache[template_id]
                if not cached.is_expired:
                    log.debug(
                        "memory_cache_hit",
                        size=cached.file_size,
                        age_hours=cached.age_seconds / 3600,
                    )
                    return cached.data
                else:
                    # Remove expired entry
                    log.debug("memory_cache_expired")
                    del self._memory_cache[template_id]

            # 2. Check disk cache
            disk_cached = self._load_from_disk(template_id)
            if disk_cached:
                # Also store in memory
                self._memory_cache[template_id] = disk_cached
                return disk_cached.data

            # 3. Download from file-svc
            log.info("downloading_template")
            
            result = await self.file_repository.download_file(
                file_id=template_id,
                user_id=user_id,
            )

            if not result.get("success"):
                error = result.get("error", "Unknown error")
                log.error("template_download_failed", error=error)
                raise RuntimeError(f"Download failed: {error}")

            data = result.get("data")
            if not data:
                log.error("template_download_empty")
                raise RuntimeError("Downloaded template is empty")

            # Cache the template
            cached = CachedTemplate(
                template_id=template_id,
                data=data,
                file_name=result.get("file_name"),
                cached_at=time.time(),
                file_size=len(data),
            )

            # Store in memory
            self._memory_cache[template_id] = cached

            # Store on disk
            self._save_to_disk(template_id, data)

            log.info(
                "template_downloaded_and_cached",
                size=len(data),
            )

            return data

    def invalidate(self, template_id: UUID) -> None:
        """
        Invalidate cache for a template.

        Args:
            template_id: Template to invalidate
        """
        # Remove from memory
        if template_id in self._memory_cache:
            del self._memory_cache[template_id]

        # Remove from disk
        disk_path = self._get_disk_path(template_id)
        disk_path.unlink(missing_ok=True)

        # Remove lock
        self._locks.pop(template_id, None)

        logger.debug("cache_invalidated", template_id=str(template_id))

    def clear(self) -> None:
        """Clear all cached templates."""
        # Clear memory
        self._memory_cache.clear()
        self._locks.clear()

        # Clear disk
        for file in self.cache_dir.glob("*.pdf"):
            try:
                file.unlink()
            except Exception:
                pass

        logger.info("cache_cleared")

    def cleanup_expired(self) -> int:
        """
        Remove expired entries from cache.

        Returns:
            Number of entries removed
        """
        removed = 0

        # Cleanup memory
        expired_ids = [
            tid for tid, cached in self._memory_cache.items()
            if cached.is_expired
        ]
        for tid in expired_ids:
            del self._memory_cache[tid]
            self._locks.pop(tid, None)
            removed += 1

        # Cleanup disk
        now = time.time()
        for file in self.cache_dir.glob("*.pdf"):
            try:
                mtime = file.stat().st_mtime
                if (now - mtime) > CACHE_TTL_SECONDS:
                    file.unlink()
                    removed += 1
            except Exception:
                pass

        if removed > 0:
            logger.info("cache_cleanup_completed", removed=removed)

        return removed

    @property
    def stats(self) -> dict:
        """Get cache statistics."""
        memory_count = len(self._memory_cache)
        memory_size = sum(c.file_size for c in self._memory_cache.values())
        
        disk_count = 0
        disk_size = 0
        for file in self.cache_dir.glob("*.pdf"):
            try:
                disk_count += 1
                disk_size += file.stat().st_size
            except Exception:
                pass

        return {
            "memory_count": memory_count,
            "memory_size_bytes": memory_size,
            "disk_count": disk_count,
            "disk_size_bytes": disk_size,
            "ttl_seconds": CACHE_TTL_SECONDS,
        }
