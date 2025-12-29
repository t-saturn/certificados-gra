# =============================================================================
# Makefile - pdf-svc development commands
# Uses uv for package management (uv sync, not pip)
# =============================================================================

.PHONY: help setup dev test test-unit test-integration lint format run clean

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
	@echo "    test-unit    - Run unit tests only"
	@echo "    test-int     - Run integration tests only"
	@echo "    test-cov     - Run tests with coverage"
	@echo ""
	@echo "  Code Quality:"
	@echo "    lint         - Run linting checks"
	@echo "    format       - Format code"
	@echo "    typecheck    - Run type checking"
	@echo ""
	@echo "  NATS Debugging:"
	@echo "    nats-sub     - Subscribe to pdf events"
	@echo "    nats-pub     - Publish test event"
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

# Run with auto-reload (requires watchfiles)
dev:
	uv run watchfiles "python -m pdf_svc.main" src

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------

# Run all tests
test:
	uv run pytest tests/ -v --tb=short

# Run only unit tests
test-unit:
	uv run pytest tests/ -v --tb=short -m unit

# Run only integration tests
test-int:
	uv run pytest tests/ -v --tb=short -m integration

# Run with coverage
test-cov:
	uv run pytest tests/ -v --cov=pdf_svc --cov-report=html --cov-report=term

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

nats-pub:
	@echo "Publishing test batch request..."
	nats pub pdf.batch.requested '{"event_type":"pdf.batch.requested","payload":{"project_id":"11111111-1111-1111-1111-111111111111","items":[{"user_id":"22222222-2222-2222-2222-222222222222","template_id":"33333333-3333-3333-3333-333333333333","serial_code":"TEST-001","is_public":true,"pdf":[{"key":"nombre","value":"Test User"}],"qr":[{"base_url":"https://example.com/verify"},{"verify_code":"TEST-001"}],"qr_pdf":[{"qr_size_cm":"2.5"},{"qr_page":"0"}]}]}}'

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
