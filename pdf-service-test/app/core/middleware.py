import time
from fastapi import Request
import structlog

log = structlog.get_logger("http")


async def request_logger(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    log.info(
        "request",
        method=request.method,
        path=request.url.path,
        query=str(request.url.query),
        status_code=response.status_code,
        elapsed_ms=round(elapsed_ms, 2),
    )
    return response
