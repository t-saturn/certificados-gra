from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.api.schemas.generate_doc import GenerateDocRequest
from app.deps import get_jobs_service
from app.services.jobs_service import JobsService

router = APIRouter(tags=["generate"])

@router.post("/generate-doc", status_code=202)
async def generate_doc(
    payload: List[GenerateDocRequest],
    jobs: JobsService = Depends(get_jobs_service),
):
    if not payload:
        raise HTTPException(status_code=400, detail="payload must be a non-empty array")

    # Convert pydantic models to plain dict (serializable)
    items = [p.model_dump() for p in payload]

    job_id = await jobs.submit_generate_docs(items)
    return {"job_id": job_id, "status": "QUEUED", "total": len(items)}
