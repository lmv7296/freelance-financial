.PHONY: run dev build test test-cover audit clean db-up db-down db-logs help

# Detect Go binary location
GO ?= $(shell which go 2>/dev/null || which /usr/local/go/bin/go 2>/dev/null || echo go)

# Default binary name and entry point
BINARY_NAME=bin/api
MAIN_PATH=./cmd/api

help:
	@echo "Available commands:"
	@echo "  make run        - Run development server (listens continuously for requests)"
	@echo "  make dev        - Run with hot-reloading (auto-restarts on code save)"
	@echo "  make build      - Compile optimized production binary to bin/api"
	@echo "  make test       - Run all unit and integration tests"
	@echo "  make test-cover - Run tests with code coverage analysis"
	@echo "  make audit      - Run go vet static analysis"
	@echo "  make db-up      - Start Postgres and Adminer containers in background"
	@echo "  make db-down    - Stop database containers"
	@echo "  make db-logs    - Follow database container logs"
	@echo "  make clean      - Remove compiled binaries and test artifacts"

run:
	$(GO) run $(MAIN_PATH)

dev:
	@if command -v air > /dev/null 2>&1; then \
		air; \
	elif [ -f $(HOME)/go/bin/air ]; then \
		$(HOME)/go/bin/air; \
	else \
		echo "💡 'air' hot-reloader not found. Starting with standard '$(GO) run'..."; \
		echo "💡 To enable auto-reloading on save, run: go install github.com/air-verse/air@latest"; \
		$(GO) run $(MAIN_PATH); \
	fi

build:
	@mkdir -p bin
	CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o $(BINARY_NAME) $(MAIN_PATH)
	@echo "Binary generated at $(BINARY_NAME)"

test:
	$(GO) test -v -race ./...

test-cover:
	$(GO) test -race -coverprofile=cover.out -covermode=atomic ./...
	$(GO) tool cover -func=cover.out

audit:
	$(GO) vet ./...

db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f

clean:
	rm -rf bin/ cover.out
