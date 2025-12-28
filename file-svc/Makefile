.PHONY: setup dev run build release fmt lint clean test check help

# Variables
CARGO := cargo
BINARY := file-svc
TARGET_DIR := target
LOG_DIR := ./logs

# Colors
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(GREEN)file-svc$(NC) - File Gateway Microservice"
	@echo ""
	@echo "$(YELLOW)Usage:$(NC)"
	@echo "  make $(GREEN)<command>$(NC)"
	@echo ""
	@echo "$(YELLOW)Commands:$(NC)"
	@grep -E '^##' Makefile | sed -e 's/## /  /' | sed -e 's/:/: /'

## setup: Install dependencies and setup environment
setup:
	@echo "$(GREEN)Setting up project...$(NC)"
	@cp -n .env.example .env 2>/dev/null || true
	@mkdir -p $(LOG_DIR)
	@$(CARGO) fetch
	@echo "$(GREEN)Setup complete!$(NC)"

## dev: Run in development mode with hot reload
dev:
	@echo "$(GREEN)Starting development server...$(NC)"
	@RUST_LOG=debug $(CARGO) watch -x run

## run: Run the application
run:
	@echo "$(GREEN)Running application...$(NC)"
	@RUST_LOG=info $(CARGO) run

## build: Build for development
build:
	@echo "$(GREEN)Building for development...$(NC)"
	@$(CARGO) build

## release: Build optimized release binary
release:
	@echo "$(GREEN)Building release binary...$(NC)"
	@$(CARGO) build --release
	@echo "$(GREEN)Binary located at: $(TARGET_DIR)/release/$(BINARY)$(NC)"

## fmt: Format code
fmt:
	@echo "$(GREEN)Formatting code...$(NC)"
	@$(CARGO) fmt

## lint: Run clippy linter
lint:
	@echo "$(GREEN)Running clippy...$(NC)"
	@$(CARGO) clippy -- -D warnings

## check: Run cargo check
check:
	@echo "$(GREEN)Checking code...$(NC)"
	@$(CARGO) check

## test: Run tests
test:
	@echo "$(GREEN)Running tests...$(NC)"
	@$(CARGO) test

## test-verbose: Run tests with output
test-verbose:
	@echo "$(GREEN)Running tests with output...$(NC)"
	@$(CARGO) test -- --nocapture

## test-upload: Run upload tests only
test-upload:
	@echo "$(GREEN)Running upload tests...$(NC)"
	@$(CARGO) test --test upload_tests -- --nocapture

## test-download: Run download tests only
test-download:
	@echo "$(GREEN)Running download tests...$(NC)"
	@$(CARGO) test --test download_tests -- --nocapture

## test-events: Run event tests only
test-events:
	@echo "$(GREEN)Running event tests...$(NC)"
	@$(CARGO) test --test upload_events_tests --test download_events_tests -- --nocapture

## test-signature: Run signature tests only
test-signature:
	@echo "$(GREEN)Running signature tests...$(NC)"
	@$(CARGO) test --test signature_tests -- --nocapture

## test-coverage: Run tests with coverage (requires cargo-tarpaulin)
test-coverage:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	@cargo tarpaulin --out Html

## test-integration: Run integration tests (requires running service)
test-integration:
	@echo "$(GREEN)Running integration tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service must be running (make run)$(NC)"
	@$(CARGO) test --test integration_upload_test --test integration_download_test -- --nocapture

## test-integration-events: Run NATS event tests
test-integration-events:
	@echo "$(GREEN)Running NATS event tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service and NATS must be running$(NC)"
	@$(CARGO) test --test integration_events_test -- --nocapture

## test-integration-all: Run all integration tests
test-integration-all:
	@echo "$(GREEN)Running all integration tests...$(NC)"
	@$(CARGO) test --test integration_upload_test --test integration_download_test --test integration_events_test -- --nocapture

## clean: Clean build artifacts
clean:
	@echo "$(RED)Cleaning build artifacts...$(NC)"
	@$(CARGO) clean
	@rm -rf $(LOG_DIR)/*.log
	@echo "$(GREEN)Clean complete!$(NC)"

## docker-build: Build Docker image
docker-build:
	@echo "$(GREEN)Building Docker image...$(NC)"
	@docker build -t $(BINARY):latest .

## docker-run: Run Docker container
docker-run:
	@echo "$(GREEN)Running Docker container...$(NC)"
	@docker run --rm --env-file .env -p 8080:8080 $(BINARY):latest

# Default target
.DEFAULT_GOAL := help
