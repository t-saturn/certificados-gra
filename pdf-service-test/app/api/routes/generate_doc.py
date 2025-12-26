from __future__ import annotations

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends
from app.deps import get_jobs_repository
from app.repositories.jobs_repository import JobsRepository
from app.api.schemas.generate_doc import GenerateDocRequest

router = APIRouter(tags=["generate-doc"])

@router.post("/generate-doc")
async def generate_doc(
    items: List[GenerateDocRequest],
    repo: JobsRepository = Depends(get_jobs_repository),
):
    job_id = str(uuid4())
    total = len(items)

    await repo.create_job(job_id, total=total)

    payload = {
        "type": "GENERATE_DOCS",
        "job_id": job_id,
        "items": [it.model_dump() for it in items],  # <-- incluye client_ref
    }

    await repo.push_job(payload)

    return {"job_id": job_id, "status": "QUEUED", "total": total}
