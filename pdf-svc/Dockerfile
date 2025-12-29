# =============================================================================
# pdf-svc Dockerfile
# Event-driven PDF generation microservice
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for faster package management
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml ./

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN uv pip install --no-cache .

# -----------------------------------------------------------------------------
# Stage 2: Runtime
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

LABEL maintainer="Inteligente"
LABEL description="Event-driven PDF generation microservice"
LABEL version="1.0.0"

# Create non-root user for security
RUN groupadd --gid 1000 pdfuser \
    && useradd --uid 1000 --gid pdfuser --shell /bin/bash --create-home pdfuser

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libfontconfig1 \
    libfreetype6 \
    libjpeg62-turbo \
    libpng16-16 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=pdfuser:pdfuser src/ ./src/
COPY --chown=pdfuser:pdfuser assets/ ./assets/

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp /app/assets \
    && chown -R pdfuser:pdfuser /app

# Set environment variables
ENV PYTHONPATH=/app/src \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LOG_DIR=/app/logs \
    TEMP_DIR=/app/tmp \
    ENVIRONMENT=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys; sys.exit(0)" || exit 1

# Switch to non-root user
USER pdfuser

# Expose no ports (NATS communication only)
# Service communicates via NATS events, no HTTP endpoints

# Run the service
CMD ["python", "-m", "pdf_svc.main"]
