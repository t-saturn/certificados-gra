from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.api.schemas.generate_doc import GenerateDocRequest
from app.deps import get_pdf_generation_service
from app.services.pdf_generation_service import PdfGenerationService

router = APIRouter(tags=["generate"])


@router.post("/generate-doc")
async def generate_doc(
    payload: GenerateDocRequest,
    gen: PdfGenerationService = Depends(get_pdf_generation_service),
):
    # Validate template UUID -> 400
    try:
        template_uuid = UUID(payload.template)
    except ValueError:
        raise HTTPException(status_code=400, detail="template must be a UUID")

    try:
        result = await gen.generate_and_upload(
            template_file_id=template_uuid,
            qr=payload.qr,
            qr_pdf=payload.qr_pdf,
            pdf=payload.pdf,
            output_filename="generated.pdf",
            is_public=payload.is_public,
            user_id=payload.user_id or "system",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": result["message"], "file_id": result["file_id"]}
