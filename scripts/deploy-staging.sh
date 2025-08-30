#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "🚀 Starting staging deployment..."

# Variables
STAGING_HOST="staging.yourdomain.com"
STAGING_USER="deploy"
STAGING_PATH="/var/www/staging"
GIT_BRANCH="develop"
BACKUP_DIR="/var/backups/staging/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if required environment variables are set
if [ -z "$STAGING_DATABASE_URL" ]; then
    log_error "STAGING_DATABASE_URL environment variable is not set"
    exit 1
fi

if [ -z "$STAGING_REDIS_URL" ]; then
    log_error "STAGING_REDIS_URL environment variable is not set"
    exit 1
fi

# Run tests
log_info "Running tests..."
npm run test:unit || {
    log_error "Unit tests failed"
    exit 1
}

npm run test:integration || {
    log_error "Integration tests failed"
    exit 1
}

log_success "All tests passed"

# Lint and type check
log_info "Running code quality checks..."
npm run lint || {
    log_error "Linting failed"
    exit 1
}

npm run type-check || {
    log_error "Type checking failed"
    exit 1
}

log_success "Code quality checks passed"

# Build application
log_info "Building application..."
npm run build || {
    log_error "Build failed"
    exit 1
}

log_success "Application built successfully"

# Build Docker images
log_info "Building Docker images..."
docker-compose -f docker-compose.staging.yml build || {
    log_error "Docker build failed"
    exit 1
}

log_success "Docker images built successfully"

# Create backup directory
log_info "Creating backup directory..."
mkdir -p ./backups/staging

# Deploy to staging
log_info "Deploying to staging environment..."

# Stop existing services
log_info "Stopping existing services..."
docker-compose -f docker-compose.staging.yml down || {
    log_warning "Failed to stop some services (they might not be running)"
}

# Start services
log_info "Starting services..."
docker-compose -f docker-compose.staging.yml up -d || {
    log_error "Failed to start services"
    exit 1
}

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 30

# Run database migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.staging.yml exec -T api npm run db:migrate || {
    log_error "Database migration failed"
    exit 1
}

log_success "Database migrations completed"

# Health checks
log_info "Running health checks..."
sleep 10

# Check API health
if curl -f http://localhost:8888/api/health > /dev/null 2>&1; then
    log_success "API health check passed"
else
    log_error "API health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    log_success "Frontend health check passed"
else
    log_error "Frontend health check failed"
    exit 1
fi

# Run smoke tests
log_info "Running smoke tests..."
npm run test:smoke:staging || {
    log_warning "Some smoke tests failed, but deployment continues"
}

# Cleanup old images
log_info "Cleaning up old Docker images..."
docker image prune -f || {
    log_warning "Failed to cleanup old images"
}

log_success "Staging deployment completed successfully!"
log_info "Application available at: http://localhost:80"
log_info "API available at: http://localhost:8888"

# Send notification (if webhook is configured)
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 Staging deployment completed successfully!"}' \
        "$SLACK_WEBHOOK_URL" || {
        log_warning "Failed to send Slack notification"
    }
fi

echo ""
log_success "Deployment Summary:"
echo "  📦 Environment: Staging"
echo "  🌐 Frontend: http://localhost:80"
echo "  🔌 API: http://localhost:8888"
echo "  📊 Proxy: http://localhost:8888"
echo "  🗄️  Database: PostgreSQL (internal)"
echo "  🔄 Redis: Redis (internal)"
echo ""
log_info "To view logs: docker-compose -f docker-compose.staging.yml logs -f"
log_info "To stop services: docker-compose -f docker-compose.staging.yml down"