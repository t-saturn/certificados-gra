FROM python:3.12-slim

# Recomendado para logs / performance
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias del sistema (ajusta si tu PDF lib necesita más)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copia solo manifests primero (mejor cache)
COPY pdf-service/pyproject.toml pdf-service/uv.lock* /app/

# Instala deps (sin instalar tu proyecto aún)
RUN uv sync --frozen --no-dev

# Copia el código
COPY pdf-service/ /app/

# Por defecto, exponemos el puerto del API (cámbialo si quieres)
EXPOSE 5050

# Por defecto arranca el API (el worker lo sobreescribe en compose)
CMD ["uv", "run", "python", "run.py"]
