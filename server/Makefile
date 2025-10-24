# Makefile
SHELL := /bin/bash
.ONESHELL:

# --- Config ---
APP_NAME ?= server
GO        ?= go
AIR       ?= air
ENTRY     ?= cmd/$(APP_NAME)/main.go

# Objetivo por defecto
.DEFAULT_GOAL := help

# --- Phony targets ---
.PHONY: help dev run

## Mostrar esta ayuda
help:
	@echo ""
	@echo "Comandos disponibles:"
	@echo "---------------------"
	@awk 'BEGIN {FS := ":.*##"} /^[a-zA-Z0-9\._-]+:.*##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables:"
	@echo "  APP_NAME  (default: $(APP_NAME))"
	@echo "  ENTRY     (default: $(ENTRY))"
	@echo ""

## Desarrollo en caliente con air
dev:
	@if ! command -v $(AIR) >/dev/null 2>&1; then \
		echo "❌ 'air' no está instalado. Instálalo:  go install github.com/air-verse/air@latest"; \
		exit 1; \
	fi
	$(AIR)

## Ejecutar en modo producción simple (go run)
run:
	$(GO) run $(ENTRY)
