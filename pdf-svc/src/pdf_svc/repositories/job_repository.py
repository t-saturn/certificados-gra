"""
Redis Job Repository - Persistence for batch jobs.
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

import orjson
import structlog
from redis.asyncio import Redis

from pdf_svc.config.settings import Settings
from pdf_svc.models.job import BatchJob, JobStatus

if TYPE_CHECKING:
    pass

logger = structlog.get_logger()


class RedisJobRepository:
    """Repository for batch job persistence in Redis."""

    def __init__(
        self,
        redis_client: Redis,
        settings: Settings,
    ) -> None:
        """
        Initialize job repository.

        Args:
            redis_client: Connected Redis client
            settings: Application settings
        """
        self.redis = redis_client
        self.settings = settings
        self.key_prefix = settings.redis.key_prefix
        self.ttl = settings.redis.job_ttl_seconds

    def _job_key(self, job_id: UUID) -> str:
        """Generate Redis key for a job."""
        return f"{self.key_prefix}:job:{job_id}"

    async def save(self, job: BatchJob) -> None:
        """
        Save a batch job to Redis.

        Args:
            job: BatchJob to save
        """
        key = self._job_key(job.job_id)
        data = orjson.dumps(job.model_dump(mode="json"))

        await self.redis.setex(
            key,
            self.ttl,
            data,
        )

        logger.debug(
            "job_saved",
            job_id=str(job.job_id),
            status=job.status.value,
            key=key,
        )

    async def get(self, job_id: UUID) -> BatchJob | None:
        """
        Get a batch job by ID.

        Args:
            job_id: Job UUID

        Returns:
            BatchJob if found, None otherwise
        """
        key = self._job_key(job_id)
        data = await self.redis.get(key)

        if data is None:
            return None

        job_dict = orjson.loads(data)
        return BatchJob.model_validate(job_dict)

    async def delete(self, job_id: UUID) -> bool:
        """
        Delete a job by ID.

        Args:
            job_id: Job UUID

        Returns:
            True if deleted, False if not found
        """
        key = self._job_key(job_id)
        result = await self.redis.delete(key)
        return result > 0

    async def exists(self, job_id: UUID) -> bool:
        """
        Check if a job exists.

        Args:
            job_id: Job UUID

        Returns:
            True if exists
        """
        key = self._job_key(job_id)
        return await self.redis.exists(key) > 0

    async def update_status(
        self,
        job_id: UUID,
        status: JobStatus,
    ) -> bool:
        """
        Update job status.

        Args:
            job_id: Job UUID
            status: New status

        Returns:
            True if updated, False if job not found
        """
        job = await self.get(job_id)
        if job is None:
            return False

        job.status = status
        await self.save(job)
        return True

    async def get_all_by_status(
        self,
        status: JobStatus,
        limit: int = 100,
    ) -> list[BatchJob]:
        """
        Get all jobs with a specific status.

        Args:
            status: Status to filter by
            limit: Maximum number of jobs to return

        Returns:
            List of BatchJobs matching status
        """
        pattern = f"{self.key_prefix}:job:*"
        jobs = []

        async for key in self.redis.scan_iter(pattern, count=limit):
            data = await self.redis.get(key)
            if data:
                job_dict = orjson.loads(data)
                job = BatchJob.model_validate(job_dict)
                if job.status == status:
                    jobs.append(job)
                    if len(jobs) >= limit:
                        break

        return jobs

    async def get_pending_jobs(self, limit: int = 100) -> list[BatchJob]:
        """
        Get all pending jobs.

        Args:
            limit: Maximum number of jobs to return

        Returns:
            List of pending BatchJobs
        """
        return await self.get_all_by_status(JobStatus.PENDING, limit)

    async def get_processing_jobs(self, limit: int = 100) -> list[BatchJob]:
        """
        Get all processing jobs.

        Args:
            limit: Maximum number of jobs to return

        Returns:
            List of processing BatchJobs
        """
        return await self.get_all_by_status(JobStatus.PROCESSING, limit)

    async def enqueue_job(self, job: BatchJob) -> None:
        """
        Save job and add to processing queue.

        Args:
            job: BatchJob to enqueue
        """
        # Save job
        await self.save(job)

        # Add to queue
        queue_key = f"{self.key_prefix}:{self.settings.redis.queue_pdf_jobs}"
        await self.redis.rpush(queue_key, str(job.job_id))

        logger.info(
            "job_enqueued",
            job_id=str(job.job_id),
            queue=queue_key,
            total_items=job.total_items,
        )

    async def dequeue_job(self, timeout: float = 5.0) -> BatchJob | None:
        """
        Get next job from processing queue.

        Args:
            timeout: Timeout in seconds for blocking pop

        Returns:
            BatchJob if available, None otherwise
        """
        queue_key = f"{self.key_prefix}:{self.settings.redis.queue_pdf_jobs}"

        result = await self.redis.blpop(queue_key, timeout=timeout)
        if result is None:
            return None

        _, job_id_bytes = result
        job_id = UUID(job_id_bytes.decode())

        return await self.get(job_id)

    async def get_queue_length(self) -> int:
        """
        Get number of jobs in the queue.

        Returns:
            Queue length
        """
        queue_key = f"{self.key_prefix}:{self.settings.redis.queue_pdf_jobs}"
        return await self.redis.llen(queue_key)
