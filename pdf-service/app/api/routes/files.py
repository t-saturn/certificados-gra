from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

from app.deps import get_file_service
from app.services.file_service import FileService

router = APIRouter(tags=["files"])


@router.get("/files/{file_id}")
async def download_file(file_id: str, svc: FileService = Depends(get_file_service)):
    try:
        file_uuid = UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="file_id must be a UUID")

    upstream = await svc.fn_download_file(file_uuid)

    content_type = upstream.headers.get("content-type", "application/octet-stream")
    headers = {}
    for h in ("content-disposition", "cache-control"):
        if upstream.headers.get(h):
            headers[h] = upstream.headers[h]

    return Response(content=upstream.content, media_type=content_type, headers=headers)


@router.post("/files")
async def upload_file(
    user_id: str = Form(...),
    is_public: bool = Form(True),
    file: UploadFile = File(...),
    svc: FileService = Depends(get_file_service),
):
    content = await file.read()

    upstream = await svc.fn_upload_file(
        user_id=user_id,
        is_public=is_public,
        filename=file.filename or "file",
        content_type=file.content_type or "application/octet-stream",
        content=content,
    )

    return JSONResponse(content=upstream.json(), status_code=upstream.status_code)
