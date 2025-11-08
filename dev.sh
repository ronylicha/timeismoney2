#!/bin/bash

# Time Is Money 2 - Development Server Launcher
# Usage: ./dev.sh [command]
# Commands: start, queue, vite, all

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[Time Is Money 2]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if .env exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_status "Copying .env.example to .env..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please configure your .env file and run this script again"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Function to start Laravel server
start_laravel() {
    print_status "Starting Laravel development server..."

    if port_in_use 8000; then
        print_warning "Port 8000 is already in use"
        print_status "Trying to use port 8001..."
        php artisan serve --host=0.0.0.0 --port=8001
    else
        php artisan serve --host=0.0.0.0 --port=8000
    fi
}

# Function to start queue worker
start_queue() {
    print_status "Starting queue worker..."
    php artisan queue:listen --tries=3 --timeout=60
}

# Function to start Vite dev server
start_vite() {
    print_status "Starting Vite development server..."

    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm install
    fi

    npm run dev
}

# Function to start all services
start_all() {
    print_status "Starting all development services..."

    # Check if concurrently is available
    if command_exists npx && npm list -g concurrently >/dev/null 2>&1 || [ -f "node_modules/.bin/concurrently" ]; then
        print_success "Using concurrently to start all services"
        npx concurrently -c "#93c5fd,#c4b5fd,#fb7185,#fdba74" \
            "php artisan serve --host=0.0.0.0 --port=8000" \
            "php artisan queue:listen --tries=3 --timeout=60" \
            "php artisan pail --timeout=0" \
            "npm run dev" \
            --names=server,queue,logs,vite \
            --kill-others
    else
        print_warning "concurrently not found. Installing..."
        npm install --save-dev concurrently
        print_success "concurrently installed. Rerun this script."
        exit 1
    fi
}

# Function to run migrations
run_migrations() {
    print_status "Running database migrations..."
    php artisan migrate --force
    print_success "Migrations completed"
}

# Function to seed database
seed_database() {
    print_status "Seeding database..."
    php artisan db:seed --force
    print_success "Database seeded"
}

# Function to setup application
setup_app() {
    print_status "Setting up Time Is Money 2..."

    # Generate app key if not exists
    if ! grep -q "APP_KEY=base64:" .env; then
        print_status "Generating application key..."
        php artisan key:generate
        print_success "Application key generated"
    fi

    # Create storage link
    print_status "Creating storage link..."
    php artisan storage:link

    # Install composer dependencies
    if [ ! -d "vendor" ]; then
        print_status "Installing composer dependencies..."
        composer install
        print_success "Composer dependencies installed"
    fi

    # Install npm dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
        print_success "NPM dependencies installed"
    fi

    # Run migrations
    run_migrations

    # Seed database
    read -p "Do you want to seed the database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        seed_database
    fi

    # Build assets
    print_status "Building assets..."
    npm run build
    print_success "Assets built"

    print_success "Setup completed!"
    print_status "You can now run: ./dev.sh start (or ./dev.sh all)"
}

# Function to clear caches
clear_caches() {
    print_status "Clearing caches..."
    php artisan optimize:clear
    php artisan cache:clear
    print_success "Caches cleared"
}

# Function to optimize for production
optimize_prod() {
    print_status "Optimizing for production..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    npm run build
    print_success "Production optimization completed"
}

# Display help
show_help() {
    cat << EOF
${BLUE}Time Is Money 2 - Development Server Launcher${NC}

${GREEN}Usage:${NC}
    ./dev.sh [command]

${GREEN}Commands:${NC}
    ${YELLOW}start${NC}      Start Laravel server only (default)
    ${YELLOW}queue${NC}      Start queue worker only
    ${YELLOW}vite${NC}       Start Vite dev server only
    ${YELLOW}all${NC}        Start all services (Laravel + Queue + Logs + Vite)
    ${YELLOW}setup${NC}      Initial setup (install dependencies, migrate, seed)
    ${YELLOW}migrate${NC}    Run database migrations
    ${YELLOW}seed${NC}       Seed the database
    ${YELLOW}fresh${NC}      Fresh migration with seed
    ${YELLOW}clear${NC}      Clear all caches
    ${YELLOW}optimize${NC}   Optimize for production
    ${YELLOW}help${NC}       Show this help message

${GREEN}Examples:${NC}
    ./dev.sh              # Start Laravel server
    ./dev.sh all          # Start all services
    ./dev.sh setup        # Initial setup

${GREEN}Default URLs:${NC}
    Laravel: ${BLUE}http://localhost:8000${NC}
    Vite:    ${BLUE}http://localhost:5173${NC}

EOF
}

# Main script
case "${1:-start}" in
    start|serve)
        start_laravel
        ;;
    queue)
        start_queue
        ;;
    vite)
        start_vite
        ;;
    all)
        start_all
        ;;
    setup)
        setup_app
        ;;
    migrate)
        run_migrations
        ;;
    seed)
        seed_database
        ;;
    fresh)
        print_status "Running fresh migration..."
        php artisan migrate:fresh --force
        seed_database
        ;;
    clear)
        clear_caches
        ;;
    optimize)
        optimize_prod
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
