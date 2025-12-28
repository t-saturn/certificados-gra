from __future__ import annotations

import asyncio
import json
from uuid import UUID

import httpx
import structlog
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError

from app.core.config import get_settings
from app.core.redis import get_redis
from app.repositories.files_repository import HttpFilesRepository
from app.services.file_service import FileService
from app.services.pdf_generation_service import PdfGenerationService
from app.services.pdf_service import PdfService
from app.services.qr_service import QrService

log = structlog.get_logger("worker")


def build_generation_service(*, settings, client: httpx.AsyncClient) -> PdfGenerationService:
    files_repo = HttpFilesRepository(public_base_url=settings.FILE_SERVER, client=client)
    file_svc = FileService(settings=settings, repo=files_repo)

    from pathlib import Path
    logo_path = Path(__file__).resolve().parent / "app" / "assets" / "logo.png"
    qr_svc = QrService(logo_path=logo_path)

    pdf_svc = PdfService()

    return PdfGenerationService(
        settings=settings,
        file_service=file_svc,
        qr_service=qr_svc,
        pdf_service=pdf_svc,
    )


def _extract_verify_code(item: dict) -> str:
    for x in item.get("qr", []):
        if "verify_code" in x and x["verify_code"]:
            return str(x["verify_code"]).strip()
    return "UNKNOWN"


async def run_worker() -> None:
    settings = get_settings()
    redis = get_redis(settings)

    log.info(
        "worker_starting",
        queue=settings.REDIS_QUEUE_PDF_JOBS,
        redis_host=settings.REDIS_HOST,
        redis_port=settings.REDIS_PORT,
        redis_db=settings.REDIS_DB,
    )

    # Ping inicial para loguear “listo”
    try:
        pong = await redis.ping()
        log.info("redis_ready", pong=bool(pong))
    except Exception as e:
        log.error("redis_unreachable_on_start", error=str(e))

    async with httpx.AsyncClient() as client:
        gen = build_generation_service(settings=settings, client=client)

        log.info("worker_listening", queue=settings.REDIS_QUEUE_PDF_JOBS)

        while True:
            try:
                # BRPOP bloquea hasta que haya un job
                _, raw = await redis.brpop(settings.REDIS_QUEUE_PDF_JOBS, timeout=0)
                msg = json.loads(raw)

                job_type = msg.get("type")
                if job_type != "GENERATE_DOCS":
                    log.warning("job_ignored", job_type=job_type)
                    continue

                job_id: str = msg["job_id"]
                items: list[dict] = msg["items"]

                meta_key = f"job:{job_id}:meta"
                results_key = f"job:{job_id}:results"
                errors_key = f"job:{job_id}:errors"

                total = len(items)
                processed = 0
                failed = 0

                log.info("job_started", job_id=job_id, total=total)
                await redis.hset(meta_key, mapping={"status": "RUNNING"})

                for idx, item in enumerate(items):
                    verify_code = _extract_verify_code(item)

                    try:
                        template_uuid = UUID(item["template"])

                        # PdfGenerationService ahora:
                        # - construye filename determinista
                        # - calcula sha256 y size bytes
                        # - sube el PDF
                        # y devuelve: file_id, file_name, file_hash, file_size_bytes, storage_provider, verify_code
                        result = await gen.generate_and_upload(
                            template_file_id=template_uuid,
                            qr=item["qr"],
                            qr_pdf=item["qr_pdf"],
                            pdf=item["pdf"],
                            output_filename=None,
                            is_public=item.get("is_public", True),
                            user_id=item.get("user_id") or "system",
                        )

                        payload = {
                            "user_id": item.get("user_id"),
                            "file_id": result.get("file_id"),
                            "file_name": result.get("file_name"),
                            "file_hash": result.get("file_hash"),
                            "file_size_bytes": result.get("file_size_bytes"),
                            "storage_provider": result.get("storage_provider"),
                            "verify_code": result.get("verify_code") or verify_code,
                        }

                        # Validación mínima: si falta algo crítico, falla el item
                        if not payload["file_id"] or not payload["file_name"] or not payload["file_hash"] or payload["file_size_bytes"] is None:
                            raise RuntimeError(f"incomplete result metadata: {payload}")

                        await redis.rpush(
                            results_key,
                            json.dumps({
                                "client_ref": item.get("client_ref"),  # <- document_id desde Go/Rust
                                "user_id": item.get("user_id"),
                                "file_id": result["file_id"],
                                "verify_code": result.get("verify_code") or verify_code,
                                "file_name": result.get("file_name"),
                                "file_hash": result.get("file_hash"),
                                "file_size_bytes": result.get("file_size_bytes"),
                                "storage_provider": result.get("storage_provider"),
                            }),
                        )

                        processed += 1

                        log.info(
                            "item_done",
                            job_id=job_id,
                            index=idx,
                            verify_code=payload["verify_code"],
                            processed=processed,
                            failed=failed,
                            total=total,
                            file_id=payload["file_id"],
                            file_name=payload["file_name"],
                            file_size_bytes=payload["file_size_bytes"],
                        )

                    except Exception as e:
                        failed += 1
                        await redis.rpush(
                            errors_key,
                            json.dumps({
                                "index": idx,
                                "client_ref": item.get("client_ref"),
                                "verify_code": verify_code,
                                "error": str(e),
                            }),
                        )
                        log.error("item_failed", job_id=job_id, index=idx, verify_code=verify_code, error=str(e), processed=processed, failed=failed, total=total)

                    # Update meta cada item
                    await redis.hset(meta_key, mapping={"processed": processed, "failed": failed, "total": total})

                status = "DONE" if failed == 0 else "DONE_WITH_ERRORS"
                await redis.hset(meta_key, mapping={"status": status})

                log.info("job_finished", job_id=job_id, status=status, total=total, processed=processed, failed=failed)

                # deja el worker listo para el siguiente job
                log.info("worker_listening", queue=settings.REDIS_QUEUE_PDF_JOBS)

            except (RedisConnectionError, RedisTimeoutError) as e:
                # Redis cayó / problemas de red → reintenta
                log.error("redis_connection_error", error=str(e))
                await asyncio.sleep(2)
                continue

            except KeyboardInterrupt:
                log.info("worker_stopping")
                break

            except Exception as e:
                # error inesperado en el loop (no por item)
                log.error("worker_loop_error", error=str(e))
                await asyncio.sleep(1)

    log.info("worker_stopped")


if __name__ == "__main__":
    asyncio.run(run_worker())
