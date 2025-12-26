APP=pdfsvc
PY=uv run python
SRC=src

.PHONY: help install dev run lint test redis nats

help:
	@echo "Commands:"
	@echo "  make install   - Install deps (uv sync)"
	@echo "  make dev       - Run service with reload"
	@echo "  make run       - Run service without reload"
	@echo "  make lint      - Run ruff"
	@echo "  make test      - Run pytest"
	@echo "  make redis     - Start redis (docker)"
	@echo "  make nats      - Start nats (docker)"

install:
	uv sync

dev:
	@echo "Running $(APP) in dev (reload) mode..."
	$(PY) -c "import sys; sys.path.insert(0,'$(SRC)'); import pdfsvc.dev as d; d.main()"

run:
	@echo "Running $(APP)..."
	$(PY) -c "import sys; sys.path.insert(0,'$(SRC)'); import pdfsvc.main as m; import asyncio; asyncio.run(m.main())"

lint:
	uv run ruff check src

test:
	uv run pytest -q

redis:
	docker run -d --name certgra_redis -p 6379:6379 --restart unless-stopped redis:7-alpine redis-server --requirepass "supersecret" || true

nats:
	docker run -d --name certgra_nats -p 4222:4222 --restart unless-stopped nats:2.10-alpine || true
