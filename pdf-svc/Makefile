# =============================================================================
# Makefile - pdf-svc development commands
# Uses uv for package management (uv sync, not pip)
# =============================================================================

.PHONY: help setup dev test test-unit test-int lint format run clean

# Default target
help:
	@echo "Available targets:"
	@echo ""
	@echo "  Setup:"
	@echo "    setup        - Create venv and install all dependencies"
	@echo "    sync         - Sync dependencies (after changing pyproject.toml)"
	@echo ""
	@echo "  Development:"
	@echo "    run          - Run the service"
	@echo "    dev          - Run with auto-reload (using watchfiles)"
	@echo ""
	@echo "  Testing:"
	@echo "    test         - Run all tests"
	@echo "    test-unit    - Run unit tests only (NO service required)"
	@echo "    test-int     - Run integration tests (REQUIRES service running)"
	@echo "    test-cov     - Run tests with coverage"
	@echo ""
	@echo "  Code Quality:"
	@echo "    lint         - Run linting checks"
	@echo "    format       - Format code"
	@echo "    typecheck    - Run type checking"
	@echo ""
	@echo "  NATS Debugging:"
	@echo "    nats-sub     - Subscribe to pdf events"
	@echo "    nats-pub     - Publish test event (valid template)"
	@echo ""
	@echo "  Cleanup:"
	@echo "    clean        - Clean up artifacts"

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------

# Initial setup - creates venv and installs all dependencies
setup:
	uv sync --all-extras

# Sync dependencies (use after modifying pyproject.toml)
sync:
	uv sync --all-extras

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------

# Run the service
run:
	uv run python -m pdf_svc.main

# Run with auto-reload (cross-platform)
dev:
	uv run python dev.py

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------

# Run all tests (unit only, integration requires service)
test:
	uv run pytest tests/ -v --tb=short -m "unit" -s

# Run only unit tests (NO external services required)
# These tests run locally without NATS, Redis, or file-svc
test-unit:
	@echo "Running unit tests (no service required)..."
	uv run pytest tests/ -v --tb=short -m "unit" -s

# Run integration tests (REQUIRES: make run/dev + Redis + NATS + file-svc)
# These tests send real NATS events and verify responses
test-int:
	@echo ""
	@echo "=============================================="
	@echo "  INTEGRATION TESTS"
	@echo "=============================================="
	@echo "  Requirements:"
	@echo "    - Redis running on localhost:6379"
	@echo "    - NATS running on localhost:4222"
	@echo "    - file-svc running on localhost:8080"
	@echo "    - pdf-svc running (make run or make dev)"
	@echo "=============================================="
	@echo ""
	uv run pytest tests/test_integration_real.py -v --tb=short -s

# Run with coverage
test-cov:
	uv run pytest tests/ -v --cov=pdf_svc --cov-report=html --cov-report=term -m "unit"

# -----------------------------------------------------------------------------
# Code Quality
# -----------------------------------------------------------------------------

lint:
	uv run ruff check src tests

format:
	uv run ruff format src tests
	uv run ruff check --fix src tests

typecheck:
	uv run mypy src

# -----------------------------------------------------------------------------
# NATS Debugging
# -----------------------------------------------------------------------------

nats-sub:
	@echo "Subscribing to all pdf events..."
	nats sub 'pdf.>'

# Publish test event with VALID template
nats-pub:
	@echo "Publishing test batch request with VALID template..."
	nats pub pdf.batch.requested '{"event_type":"pdf.batch.requested","payload":{"pdf_job_id":"11111111-1111-1111-1111-111111111111","items":[{"user_id":"22222222-2222-2222-2222-222222222222","template_id":"8748db65-9d84-4fdf-b47f-938cfa96366b","serial_code":"TEST-001","is_public":true,"pdf":[{"key":"nombre","value":"Test User"},{"key":"curso","value":"Test Course"},{"key":"fecha","value":"29/12/2024"}],"qr":[{"base_url":"https://verify.gob.pe"},{"verify_code":"TEST-001"}],"qr_pdf":[{"qr_size_cm":"2.5"},{"qr_page":"0"}]}]}}'

# Publish test event with INVALID template (will fail)
nats-pub-fail:
	@echo "Publishing test batch request with INVALID template..."
	nats pub pdf.batch.requested '{"event_type":"pdf.batch.requested","payload":{"pdf_job_id":"22222222-2222-2222-2222-222222222222","items":[{"user_id":"33333333-3333-3333-3333-333333333333","template_id":"25a14031-1bc5-4c6f-910e-c86cc9378336","serial_code":"FAIL-001","is_public":true,"pdf":[{"key":"nombre","value":"Fail User"}],"qr":[{"base_url":"https://verify.gob.pe"},{"verify_code":"FAIL-001"}],"qr_pdf":[{"qr_size_cm":"2.5"},{"qr_page":"0"}]}]}}'

# Monitor file-svc events
nats-sub-files:
	@echo "Subscribing to file-svc events..."
	nats sub 'files.>'

# -----------------------------------------------------------------------------
# Docker
# -----------------------------------------------------------------------------

docker-build:
	docker build -t pdf-svc:latest .

# -----------------------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------------------

clean:
	rm -rf logs/*.log
	rm -rf tmp/*
	rm -rf .venv
	rm -rf __pycache__ .pytest_cache .coverage htmlcov .mypy_cache .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
