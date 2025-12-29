# =============================================================================
# Dockerfile - pdf-svc
# Multi-stage build using uv for package management
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies (creates .venv in /app)
RUN uv sync --frozen --no-dev --no-install-project

# Copy source code
COPY src/ src/

# Install the project itself
RUN uv sync --frozen --no-dev

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

# Install runtime dependencies for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfontconfig1 \
    libfreetype6 \
    libjpeg62-turbo \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1000 pdfuser \
    && useradd --uid 1000 --gid pdfuser --shell /bin/bash --create-home pdfuser

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code
COPY --from=builder /app/src /app/src

# Create directories
RUN mkdir -p /app/logs /app/tmp /app/assets \
    && chown -R pdfuser:pdfuser /app

# Switch to non-root user
USER pdfuser

# Set environment
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import pdf_svc; print('healthy')" || exit 1

# Run the service
CMD ["python", "-m", "pdf_svc.main"]