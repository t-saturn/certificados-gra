import json
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_jobs_repository
from app.repositories.jobs_repository import JobsRepository

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/{job_id}")
async def get_job(job_id: str, repo: JobsRepository = Depends(get_jobs_repository)):
    meta = await repo.get_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="job not found")

    results_raw = await repo.get_results(job_id)
    results = [json.loads(x) for x in results_raw]
    return {"job_id": job_id, "meta": meta, "results": results}


@router.get("/{job_id}/results")
async def get_job_results(job_id: str, repo: JobsRepository = Depends(get_jobs_repository)):
    meta = await repo.get_meta(job_id)
    if not meta:
        raise HTTPException(status_code=404, detail="job not found")
    results_raw = await repo.get_results(job_id)
    results = [json.loads(x) for x in results_raw]
    return {"job_id": job_id, "results": results}