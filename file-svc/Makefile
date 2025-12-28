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
CYAN := \033[0;36m
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
	@echo ""
	@echo "$(YELLOW)Integration Tests (require running service):$(NC)"
	@echo "  1. make run          $(CYAN)# Terminal 1: Start service$(NC)"
	@echo "  2. make test-upload  $(CYAN)# Terminal 2: Run upload tests$(NC)"
	@echo ""
	@echo "$(YELLOW)Windows Workflow:$(NC)"
	@echo "  1. make test-compile $(CYAN)# Compile tests (service stopped)$(NC)"
	@echo "  2. make run          $(CYAN)# Start service$(NC)"
	@echo "  3. Run .exe files from target/debug/deps/"

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

## test: Run all unit tests
test:
	@echo "$(GREEN)Running unit tests...$(NC)"
	@$(CARGO) test --lib

## test-compile: Compile all tests without running (for Windows workflow)
test-compile:
	@echo "$(GREEN)Compiling all tests...$(NC)"
	@echo "$(YELLOW)NOTE: Stop the service before compiling on Windows$(NC)"
	@$(CARGO) test --no-run
	@echo ""
	@echo "$(GREEN)Tests compiled! Executables in target/debug/deps/$(NC)"
	@echo "$(CYAN)Now start the service and run:$(NC)"
	@echo "  ./target/debug/deps/integration_upload_test-* --nocapture --test-threads=1"
	@echo "  ./target/debug/deps/integration_download_test-* --nocapture --test-threads=1"
	@echo "  ./target/debug/deps/integration_events_test-* --nocapture --test-threads=1"

## test-upload: Run upload integration tests
test-upload:
	@echo "$(GREEN)Running upload integration tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service must be running on http://localhost:8080$(NC)"
	@$(CARGO) test --test integration_upload_test -- --nocapture --test-threads=1

## test-download: Run download integration tests
test-download:
	@echo "$(GREEN)Running download integration tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service must be running on http://localhost:8080$(NC)"
	@$(CARGO) test --test integration_download_test -- --nocapture --test-threads=1

## test-events: Run NATS events integration tests
test-events:
	@echo "$(GREEN)Running NATS events integration tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service and NATS must be running$(NC)"
	@$(CARGO) test --test integration_events_test -- --nocapture --test-threads=1

## test-integration: Run all integration tests
test-integration:
	@echo "$(GREEN)Running all integration tests...$(NC)"
	@echo "$(YELLOW)NOTE: Service, Redis, and NATS must be running$(NC)"
	@echo ""
	@$(CARGO) test --test integration_upload_test -- --nocapture --test-threads=1
	@echo ""
	@$(CARGO) test --test integration_download_test -- --nocapture --test-threads=1
	@echo ""
	@$(CARGO) test --test integration_events_test -- --nocapture --test-threads=1

## test-coverage: Run tests with coverage (requires cargo-tarpaulin)
test-coverage:
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	@cargo tarpaulin --out Html

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

## docker-deps: Start Redis and NATS with Docker
docker-deps:
	@echo "$(GREEN)Starting dependencies (Redis + NATS)...$(NC)"
	@docker run -d --name filesvc_redis -p 6379:6379 redis:7-alpine redis-server --requirepass "supersecret" 2>/dev/null || echo "Redis already running"
	@docker run -d --name filesvc_nats -p 4222:4222 nats:2.10-alpine 2>/dev/null || echo "NATS already running"
	@echo "$(GREEN)Dependencies started!$(NC)"
	@echo "  Redis: localhost:6379"
	@echo "  NATS:  localhost:4222"

## docker-deps-stop: Stop Redis and NATS containers
docker-deps-stop:
	@echo "$(RED)Stopping dependencies...$(NC)"
	@docker stop filesvc_redis filesvc_nats 2>/dev/null || true
	@docker rm filesvc_redis filesvc_nats 2>/dev/null || true
	@echo "$(GREEN)Dependencies stopped!$(NC)"

## docker-deps-status: Check status of dependencies
docker-deps-status:
	@echo "$(GREEN)Checking dependencies status...$(NC)"
	@docker ps --filter "name=filesvc_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Default target
.DEFAULT_GOAL := help