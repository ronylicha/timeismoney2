.PHONY: help install dev dev-full serve queue vite fresh migrate seed clear optimize test format

# Variables
PHP := php
ARTISAN := $(PHP) artisan
COMPOSER := composer
NPM := npm

# Colors
COLOR_RESET := \033[0m
COLOR_BOLD := \033[1m
COLOR_GREEN := \033[32m
COLOR_YELLOW := \033[33m
COLOR_BLUE := \033[34m

# Default target
.DEFAULT_GOAL := help

## help: Display this help message
help:
	@echo "$(COLOR_BOLD)Time Is Money 2 - Makefile Commands$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_GREEN)Available commands:$(COLOR_RESET)"
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'
	@echo ""
	@echo "$(COLOR_YELLOW)Quick start:$(COLOR_RESET)"
	@echo "  make install    # First time setup"
	@echo "  make dev-full   # Start all services"
	@echo ""

## install: Initial setup (install dependencies, migrate, seed)
install:
	@echo "$(COLOR_BLUE)→ Installing Time Is Money 2...$(COLOR_RESET)"
	@if [ ! -f .env ]; then \
		echo "$(COLOR_YELLOW)→ Creating .env file...$(COLOR_RESET)"; \
		cp .env.example .env; \
	fi
	@echo "$(COLOR_BLUE)→ Installing Composer dependencies...$(COLOR_RESET)"
	$(COMPOSER) install
	@echo "$(COLOR_BLUE)→ Generating application key...$(COLOR_RESET)"
	$(ARTISAN) key:generate --ansi
	@echo "$(COLOR_BLUE)→ Creating storage link...$(COLOR_RESET)"
	$(ARTISAN) storage:link --ansi
	@echo "$(COLOR_BLUE)→ Installing NPM dependencies...$(COLOR_RESET)"
	$(NPM) install
	@echo "$(COLOR_BLUE)→ Running migrations...$(COLOR_RESET)"
	$(ARTISAN) migrate --force --ansi
	@echo "$(COLOR_BLUE)→ Seeding database...$(COLOR_RESET)"
	$(ARTISAN) db:seed --force --ansi
	@echo "$(COLOR_BLUE)→ Building assets...$(COLOR_RESET)"
	$(NPM) run build
	@echo "$(COLOR_GREEN)✓ Installation complete!$(COLOR_RESET)"
	@echo "$(COLOR_YELLOW)Run 'make dev-full' to start development$(COLOR_RESET)"

## dev: Start Laravel server only
dev:
	@echo "$(COLOR_BLUE)→ Starting Laravel server...$(COLOR_RESET)"
	$(ARTISAN) serve --host=0.0.0.0 --port=8000

## dev-full: Start all services (Laravel + Queue + Logs + Vite)
dev-full:
	@echo "$(COLOR_BLUE)→ Starting all development services...$(COLOR_RESET)"
	npx concurrently -c "#93c5fd,#c4b5fd,#fb7185,#fdba74" \
		"php artisan serve --host=0.0.0.0 --port=8000" \
		"php artisan queue:listen --tries=3 --timeout=60" \
		"php artisan pail --timeout=0" \
		"npm run dev" \
		--names=server,queue,logs,vite \
		--kill-others

## serve: Alias for dev
serve: dev

## queue: Start queue worker
queue:
	@echo "$(COLOR_BLUE)→ Starting queue worker...$(COLOR_RESET)"
	$(ARTISAN) queue:listen --tries=3 --timeout=60

## vite: Start Vite dev server
vite:
	@echo "$(COLOR_BLUE)→ Starting Vite...$(COLOR_RESET)"
	$(NPM) run dev

## migrate: Run database migrations
migrate:
	@echo "$(COLOR_BLUE)→ Running migrations...$(COLOR_RESET)"
	$(ARTISAN) migrate --force --ansi
	@echo "$(COLOR_GREEN)✓ Migrations complete$(COLOR_RESET)"

## seed: Seed the database
seed:
	@echo "$(COLOR_BLUE)→ Seeding database...$(COLOR_RESET)"
	$(ARTISAN) db:seed --force --ansi
	@echo "$(COLOR_GREEN)✓ Database seeded$(COLOR_RESET)"

## fresh: Fresh migration with seed
fresh:
	@echo "$(COLOR_YELLOW)⚠ This will delete all data!$(COLOR_RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(COLOR_BLUE)→ Running fresh migration...$(COLOR_RESET)"; \
		$(ARTISAN) migrate:fresh --force --ansi; \
		echo "$(COLOR_BLUE)→ Seeding database...$(COLOR_RESET)"; \
		$(ARTISAN) db:seed --force --ansi; \
		echo "$(COLOR_GREEN)✓ Fresh migration complete$(COLOR_RESET)"; \
	fi

## clear: Clear all caches
clear:
	@echo "$(COLOR_BLUE)→ Clearing caches...$(COLOR_RESET)"
	$(ARTISAN) optimize:clear --ansi
	$(ARTISAN) cache:clear --ansi
	@echo "$(COLOR_GREEN)✓ Caches cleared$(COLOR_RESET)"

## optimize: Optimize for production
optimize:
	@echo "$(COLOR_BLUE)→ Optimizing application...$(COLOR_RESET)"
	$(ARTISAN) optimize:clear --ansi
	$(ARTISAN) config:cache --ansi
	$(ARTISAN) route:cache --ansi
	$(ARTISAN) view:cache --ansi
	$(NPM) run build
	@echo "$(COLOR_GREEN)✓ Application optimized$(COLOR_RESET)"

## test: Run tests
test:
	@echo "$(COLOR_BLUE)→ Running tests...$(COLOR_RESET)"
	$(ARTISAN) config:clear --ansi
	$(ARTISAN) test

## test-coverage: Run tests with coverage
test-coverage:
	@echo "$(COLOR_BLUE)→ Running tests with coverage...$(COLOR_RESET)"
	$(ARTISAN) config:clear --ansi
	XDEBUG_MODE=coverage $(ARTISAN) test --coverage

## format: Format code with Pint
format:
	@echo "$(COLOR_BLUE)→ Formatting code...$(COLOR_RESET)"
	./vendor/bin/pint
	@echo "$(COLOR_GREEN)✓ Code formatted$(COLOR_RESET)"

## build: Build assets for production
build:
	@echo "$(COLOR_BLUE)→ Building assets...$(COLOR_RESET)"
	$(NPM) run build
	@echo "$(COLOR_GREEN)✓ Assets built$(COLOR_RESET)"

## logs: Tail application logs
logs:
	@echo "$(COLOR_BLUE)→ Tailing logs...$(COLOR_RESET)"
	$(ARTISAN) pail --timeout=0

## tinker: Start Laravel Tinker
tinker:
	$(ARTISAN) tinker

## db: Open database CLI
db:
	@echo "$(COLOR_BLUE)→ Opening database CLI...$(COLOR_RESET)"
	$(ARTISAN) db

## routes: List all routes
routes:
	$(ARTISAN) route:list

## status: Show application status
status:
	@echo "$(COLOR_BOLD)Application Status:$(COLOR_RESET)"
	@echo "$(COLOR_GREEN)Laravel:$(COLOR_RESET)"
	@$(PHP) --version | head -n 1
	@echo "$(COLOR_GREEN)Composer:$(COLOR_RESET)"
	@$(COMPOSER) --version
	@echo "$(COLOR_GREEN)Node:$(COLOR_RESET)"
	@node --version
	@echo "$(COLOR_GREEN)NPM:$(COLOR_RESET)"
	@npm --version
	@echo ""
	@if [ -f .env ]; then \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) .env file exists"; \
	else \
		echo "$(COLOR_YELLOW)⚠$(COLOR_RESET) .env file missing"; \
	fi
	@if [ -d vendor ]; then \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) Composer dependencies installed"; \
	else \
		echo "$(COLOR_YELLOW)⚠$(COLOR_RESET) Composer dependencies missing"; \
	fi
	@if [ -d node_modules ]; then \
		echo "$(COLOR_GREEN)✓$(COLOR_RESET) NPM dependencies installed"; \
	else \
		echo "$(COLOR_YELLOW)⚠$(COLOR_RESET) NPM dependencies missing"; \
	fi

## clean: Remove all generated files and caches
clean:
	@echo "$(COLOR_YELLOW)→ Cleaning project...$(COLOR_RESET)"
	rm -rf vendor
	rm -rf node_modules
	rm -rf public/build
	rm -rf bootstrap/cache/*.php
	$(ARTISAN) optimize:clear --ansi
	@echo "$(COLOR_GREEN)✓ Project cleaned$(COLOR_RESET)"
