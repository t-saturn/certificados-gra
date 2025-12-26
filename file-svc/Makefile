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
