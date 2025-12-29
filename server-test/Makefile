# Makefile
SHELL := /bin/bash
.ONESHELL:

APP_NAME      ?= server
GO            ?= go
AIR           ?= air
ENTRY         ?= cmd/$(APP_NAME)/main.go
MIGRATE_ENTRY ?= cmd/migrate/main.go
SEED_ENTRY    ?= cmd/seed/main.go

.DEFAULT_GOAL := help

.PHONY: help dev run migrate-up migrate-down migrate-reset seed

## Mostrar esta ayuda
help:
	@echo ""
	@echo "Comandos disponibles:"
	@echo "---------------------"
	@awk 'BEGIN {FS := ":.*##"} /^[a-zA-Z0-9\._-]+:.*##/ { printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "Variables:"
	@echo "  APP_NAME      (default: $(APP_NAME))"
	@echo "  ENTRY         (default: $(ENTRY))"
	@echo "  MIGRATE_ENTRY (default: $(MIGRATE_ENTRY))"
	@echo "  SEED_ENTRY    (default: $(SEED_ENTRY))"
	@echo ""

## Desarrollo en caliente con air
dev: ## Ejecutar servidor con air
	@echo "▶ Ejecutando 'air' (si no está instalado: go install github.com/air-verse/air@latest)"
	@$(AIR)

## Ejecutar en modo producción simple (go run)
run: ## go run del servidor
	$(GO) run $(ENTRY)

## Migrar la base de datos (up)
migrate-up: ## Crear/actualizar tablas
	$(GO) run $(MIGRATE_ENTRY) migrate-up

## Revertir migraciones (drop tables)
migrate-down: ## Eliminar tablas
	$(GO) run $(MIGRATE_ENTRY) migrate-down

## Resetear migraciones (down + up)
migrate-reset: ## Drop + migrate-up
	$(GO) run $(MIGRATE_ENTRY) migrate-reset

## Ejecutar seeders (usuarios, etc.)
seed: ## Ejecutar todos los seeders
	$(GO) run $(SEED_ENTRY)
