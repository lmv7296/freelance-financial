.PHONY: help dev dev-web dev-api db-up db-down test lint build

help:
	@echo "make dev      - Run the web app and the API together (http://localhost:3000)"
	@echo "make dev-web  - Run only the Next.js app (web/)"
	@echo "make dev-api  - Run only the Go API (api/, port 8085)"
	@echo "make db-up    - Start Postgres + Adminer (Docker)"
	@echo "make db-down  - Stop the database containers"
	@echo "make test     - Go tests + frontend lint and translation check"
	@echo "make build    - Build the API binary and the web app"

# -j2 runs both servers side by side; Ctrl+C stops both
dev:
	@$(MAKE) -j2 dev-api dev-web

dev-web:
	cd web && pnpm dev

dev-api:
	$(MAKE) -C api dev

db-up:
	$(MAKE) -C api db-up

db-down:
	$(MAKE) -C api db-down

test:
	cd api && go test ./...
	cd web && pnpm lint && pnpm i18n:check

lint:
	cd api && go vet ./...
	cd web && pnpm lint

build:
	$(MAKE) -C api build
	cd web && pnpm build
