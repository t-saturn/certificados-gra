.PHONY: help build run dev test clean migrate-up migrate-down migrate-reset seed docker-build docker-run

# Variables
APP_NAME=server
MAIN_PATH=./cmd/server
MIGRATE_PATH=./cmd/migrate
SEED_PATH=./cmd/seed
BUILD_DIR=./bin
DOCKER_IMAGE=cert-server

# Colors
GREEN=\033[0;32m
NC=\033[0m # No Color

help: ## Display this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the application
	@echo "Building $(APP_NAME)..."
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_PATH)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

run: build ## Build and run the application
	@echo "Running $(APP_NAME)..."
	@$(BUILD_DIR)/$(APP_NAME)

dev: ## Run with air for hot reload
	@echo "Starting development server with air..."
	@air

test: ## Run tests
	@echo "Running tests..."
	@go test -v -race -cover ./...

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -rf logs/*.log
	@rm -rf tmp
	@echo "Clean complete"

# Database commands
migrate-up: ## Run database migrations
	@echo "Running migrations UP..."
	@go run $(MIGRATE_PATH)/main.go -action=up

migrate-down: ## Rollback database migrations
	@echo "Running migrations DOWN..."
	@go run $(MIGRATE_PATH)/main.go -action=down

migrate-reset: ## Reset database (down + up)
	@echo "Resetting database..."
	@go run $(MIGRATE_PATH)/main.go -action=reset

seed: ## Seed the database with initial data
	@echo "Seeding database..."
	@go run $(SEED_PATH)/main.go

# Docker commands
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t $(DOCKER_IMAGE):latest .

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run --rm -p 8080:8080 --env-file .env $(DOCKER_IMAGE):latest

docker-compose-up: ## Start with docker-compose
	@echo "Starting services with docker-compose..."
	@docker-compose up -d

docker-compose-down: ## Stop docker-compose services
	@echo "Stopping services..."
	@docker-compose down

# Development setup
setup: ## Install development dependencies
	@echo "Installing development dependencies..."
	@go install github.com/air-verse/air@latest
	@go mod download
	@echo "Setup complete"

tidy: ## Tidy and verify go modules
	@echo "Tidying modules..."
	@go mod tidy
	@go mod verify

lint: ## Run linter
	@echo "Running linter..."
	@golangci-lint run ./...

fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...

# Full setup
init: setup tidy migrate-up seed ## Full initialization (setup, migrate, seed)
	@echo "Initialization complete!"

.DEFAULT_GOAL := help
