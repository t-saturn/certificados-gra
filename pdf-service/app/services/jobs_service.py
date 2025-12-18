from __future__ import annotations
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

from app.repositories.jobs_repository import JobsRepository

@dataclass(frozen=True)
class JobsService:
    repo: JobsRepository

    async def submit_generate_docs(self, items: list[dict[str, Any]]) -> str:
        job_id = str(uuid4())
        await self.repo.create_job(job_id, total=len(items))
        await self.repo.push_job({
            "type": "GENERATE_DOCS",
            "job_id": job_id,
            "items": items,
        })
        return job_id
