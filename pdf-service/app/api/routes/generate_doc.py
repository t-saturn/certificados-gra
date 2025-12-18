from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.schemas.generate_doc import GenerateDocRequest, GenerateDocsResponse
from app.deps import get_pdf_generation_service
from app.services.pdf_generation_service import PdfGenerationService

router = APIRouter(tags=["generate"])


@router.post("/generate-doc", response_model=GenerateDocsResponse)
async def generate_doc(
    payload: List[GenerateDocRequest],
    gen: PdfGenerationService = Depends(get_pdf_generation_service),
):
    if not payload:
        raise HTTPException(status_code=400, detail="payload must be a non-empty array")

    docs_out = []

    for idx, item in enumerate(payload):
        # template UUID -> 400 (not 422)
        try:
            template_uuid = UUID(item.template)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"[{idx}] template must be a UUID")

        try:
            result = await gen.generate_and_upload(
                template_file_id=template_uuid,
                qr=item.qr,
                qr_pdf=item.qr_pdf,
                pdf=item.pdf,
                output_filename="generated.pdf",
                is_public=item.is_public,
                user_id=item.user_id or "system",
            )
        except ValueError as e:
            # validation errors from services
            raise HTTPException(status_code=400, detail=f"[{idx}] {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"[{idx}] {str(e)}")

        docs_out.append(
            {
                "user_id": item.user_id,
                "file_id": result["file_id"],
            }
        )

    return {
        "message": "Documentos generados y subidos correctamente",
        "docs": docs_out,
    }
