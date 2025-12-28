APP=pdfsvc
PY=uv run python
SRC=src

.PHONY: help install dev run lint test redis nats \
        pub-batch sub-accepted sub-download \
        download-worker \
        sub-files-upload sub-files-download \
        sub-pdf-accepted sub-pdf-requested \
        demo

help:
	@echo "Commands:"
	@echo ""
	@echo "  Setup:"
	@echo "    make install            - Install deps (uv sync)"
	@echo "    make redis              - Start redis (docker)"
	@echo "    make nats               - Start nats (docker)"
	@echo ""
	@echo "  Run service:"
	@echo "    make dev                - Run service with reload"
	@echo "    make run                - Run service without reload"
	@echo ""
	@echo "  Workers:"
	@echo "    make download-worker    - Run download worker (queue:pdf:download)"
	@echo ""
	@echo "  Scripts (Python):"
	@echo "    make pub-batch          - Publish pdf.batch.requested"
	@echo "    make sub-accepted       - Subscribe pdf.batch.accepted"
	@echo "    make sub-download       - Subscribe filegw/files download requested"
	@echo ""
	@echo "  NATS Box (Docker):"
	@echo "    make sub-files-upload   - Subscribe files.upload.requested (docker nats-box)"
	@echo "    make sub-files-download - Subscribe files.download.requested (docker nats-box)"
	@echo ""
	@echo "  Quality:"
	@echo "    make lint               - Run ruff"
	@echo "    make test               - Run pytest"
	@echo ""
	@echo "  Demo:"
	@echo "    make demo               - Print demo flow"

# Setup
install:
	uv sync

redis:
	docker run -d --name certgra_redis -p 6379:6379 --restart unless-stopped redis:7-alpine redis-server --requirepass "supersecret" || true

nats:
	docker run -d --name certgra_nats -p 4222:4222 --restart unless-stopped nats:2.10-alpine || true

# Run service
dev:
	@echo "Running $(APP) in dev (reload) mode..."
	$(PY) -c "import sys; sys.path.insert(0,'$(SRC)'); import pdfsvc.dev as d; d.main()"

run:
	@echo "Running $(APP)..."
	$(PY) -c "import sys; sys.path.insert(0,'$(SRC)'); import pdfsvc.main as m; import asyncio; asyncio.run(m.main())"

# Workers
download-worker:
	@echo "Running download worker..."
	$(PY) -c "import sys; sys.path.insert(0,'$(SRC)'); import pdfsvc.workers.run_download as w; import asyncio; asyncio.run(w.main())"

# Scripts (Python)
pub-batch:
	@echo "Publishing pdf.batch.requested ..."
	$(PY) scripts/publish_batch_requested.py

sub-accepted:
	@echo "Subscribing to pdf.batch.accepted ..."
	$(PY) scripts/subscribe_batch_accepted.py

sub-download:
	@echo "Subscribing to download requested (filegw.download.requested + files.download.requested) ..."
	$(PY) scripts/subscribe_filegw_download_requested.py

# NATS Box (Docker) subscribers
sub-files-upload:
	@echo "Subscribing to files.upload.requested (docker nats-box)..."
	docker run --rm natsio/nats-box:latest sh -lc "nats sub files.upload.requested --server nats://host.docker.internal:4222"

sub-files-download:
	@echo "Subscribing to files.download.requested (docker nats-box)..."
	docker run --rm natsio/nats-box:latest sh -lc "nats sub files.download.requested --server nats://host.docker.internal:4222"

# Quality
lint:
	uv run ruff check src

test:
	uv run pytest -q

# Demo guide
demo:
	@echo "===== DEMO RUN ====="
	@echo ""
	@echo "Terminal 1: Start service"
	@echo "  make dev"
	@echo ""
	@echo "Terminal 2: Start worker"
	@echo "  make download-worker"
	@echo ""
	@echo "Terminal 3: Listen accepted"
	@echo "  make sub-accepted"
	@echo ""
	@echo "Terminal 4: Listen download requested"
	@echo "  make sub-download"
	@echo ""
	@echo "Terminal 5: Publish batch request"
	@echo "  make pub-batch"
	@echo ""
	@echo "Redis debugging:"
	@echo "  docker exec -it certgra_redis redis-cli -a supersecret"
	@echo "  llen queue:pdf:download"
	@echo "  lrange queue:pdf:download 0 -1"
