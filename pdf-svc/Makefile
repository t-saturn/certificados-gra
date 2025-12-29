# =============================================================================
# Makefile - Common development commands
# =============================================================================

.PHONY: help install dev test lint format build up down logs clean

# Default target
help:
	@echo "Available targets:"
	@echo "  install   - Install dependencies"
	@echo "  dev       - Install development dependencies"
	@echo "  test      - Run tests"
	@echo "  lint      - Run linting checks"
	@echo "  format    - Format code"
	@echo "  build     - Build Docker image"
	@echo "  up        - Start all services"
	@echo "  down      - Stop all services"
	@echo "  logs      - View service logs"
	@echo "  clean     - Clean up Docker resources"
	@echo "  shell     - Open shell in pdf-svc container"
	@echo "  nats-box  - Start NATS CLI debugging tools"
	@echo "  redis-cli - Open Redis CLI"
	@echo "  pub       - Publish test event to NATS"

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

install:
	pip install -e . --break-system-packages

dev:
	pip install -e ".[dev]" --break-system-packages

test:
	PYTHONPATH=src pytest tests/ -v --tb=short

test-cov:
	PYTHONPATH=src pytest tests/ -v --cov=pdf_svc --cov-report=html --cov-report=term

lint:
	ruff check src tests

format:
	ruff format src tests
	ruff check --fix src tests

typecheck:
	mypy src

# -----------------------------------------------------------------------------
# Docker
# -----------------------------------------------------------------------------

build:
	docker compose build

up:
	docker compose up -d
	@echo "Services started. View logs with: make logs"

up-build:
	docker compose up -d --build

down:
	docker compose down

down-v:
	docker compose down -v

logs:
	docker compose logs -f pdf-svc

logs-all:
	docker compose logs -f

restart:
	docker compose restart pdf-svc

# -----------------------------------------------------------------------------
# Production
# -----------------------------------------------------------------------------

prod-build:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-up:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# -----------------------------------------------------------------------------
# Debugging
# -----------------------------------------------------------------------------

shell:
	docker compose exec pdf-svc /bin/bash

nats-box:
	docker compose --profile debug up -d nats-box
	docker compose exec nats-box /bin/sh

redis-cli:
	docker compose exec redis redis-cli

# Publish test event to NATS
pub:
	@echo "Publishing test event..."
	docker compose exec nats-box nats pub pdf.process.requested '{"template_id":"test-123","user_id":"user-456","serial_code":"CERT-2025-001"}'

# Subscribe to events for debugging
sub:
	docker compose exec nats-box nats sub "pdf.>"

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------

clean:
	docker compose down -v --remove-orphans
	docker image prune -f
	rm -rf logs/*.log
	rm -rf __pycache__ .pytest_cache .coverage htmlcov
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

clean-all: clean
	docker system prune -af
