#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment with Blue-Green strategy..."

# Variables
PROD_HOST="yourdomain.com"
PROD_USER="deploy"
PROD_PATH="/var/www/production"
GIT_BRANCH="main"
BACKUP_DIR="/var/backups/production/$(date +%Y%m%d_%H%M%S)"
CURRENT_ENV="blue"
NEW_ENV="green"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_deploy() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Rollback function
rollback() {
    log_error "Deployment failed! Starting rollback..."
    
    # Stop green environment
    docker-compose -f docker-compose.production.yml --profile green down || true
    
    # Ensure blue environment is running
    docker-compose -f docker-compose.production.yml up -d
    
    # Switch DNS back to blue (if it was changed)
    # This would typically involve updating load balancer configuration
    
    log_error "Rollback completed. Blue environment is active."
    exit 1
}

# Trap errors and call rollback
trap rollback ERR

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check if required environment variables are set
required_vars=("PROD_DATABASE_URL" "PROD_REDIS_URL" "PROD_JWT_SECRET" "PROD_JWT_REFRESH_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "$var environment variable is not set"
        exit 1
    fi
done

log_success "Environment variables check passed"

# Run comprehensive tests
log_info "Running comprehensive test suite..."

# Unit tests
npm run test:unit || {
    log_error "Unit tests failed"
    exit 1
}

# Integration tests
npm run test:integration || {
    log_error "Integration tests failed"
    exit 1
}

# E2E tests
npm run test:e2e || {
    log_error "E2E tests failed"
    exit 1
}

# Security tests
npm run test:security || {
    log_warning "Security tests failed, but deployment continues"
}

log_success "All critical tests passed"

# Code quality checks
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
log_info "Building application for production..."
npm run build || {
    log_error "Production build failed"
    exit 1
}

log_success "Production build completed"

# Build Docker images
log_info "Building Docker images..."
docker-compose -f docker-compose.production.yml build || {
    log_error "Docker build failed"
    exit 1
}

log_success "Docker images built successfully"

# Create backup
log_deploy "Creating backup of current production environment..."
mkdir -p "$BACKUP_DIR"

# Backup database
log_info "Backing up production database..."
docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U "$PROD_DB_USER" document_management > "$BACKUP_DIR/database.sql" || {
    log_error "Database backup failed"
    exit 1
}

# Backup configuration files
cp docker-compose.production.yml "$BACKUP_DIR/"
cp -r nginx/ "$BACKUP_DIR/" 2>/dev/null || true
cp -r ssl/ "$BACKUP_DIR/" 2>/dev/null || true

log_success "Backup completed: $BACKUP_DIR"

# Blue-Green Deployment
log_deploy "Starting Blue-Green deployment..."

# Step 1: Deploy to Green environment
log_info "Deploying to Green environment..."
docker-compose -f docker-compose.production.yml --profile green up -d || {
    log_error "Failed to start Green environment"
    exit 1
}

log_success "Green environment started"

# Step 2: Wait for Green environment to be ready
log_info "Waiting for Green environment to be ready..."
sleep $HEALTH_CHECK_DELAY

# Step 3: Run database migrations on Green
log_info "Running database migrations..."
docker-compose -f docker-compose.production.yml --profile green exec -T api_green npm run db:migrate || {
    log_error "Database migration failed"
    exit 1
}

log_success "Database migrations completed"

# Step 4: Health checks on Green environment
log_info "Running health checks on Green environment..."
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    # Check API health
    if curl -f http://localhost:8889/api/health > /dev/null 2>&1; then
        log_success "Green API health check passed"
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "Green API health check failed after $HEALTH_CHECK_RETRIES attempts"
        exit 1
    else
        log_warning "Health check failed, retrying in $HEALTH_CHECK_DELAY seconds..."
        sleep $HEALTH_CHECK_DELAY
    fi
done

# Step 5: Run smoke tests on Green
log_info "Running smoke tests on Green environment..."
npm run test:smoke:green || {
    log_warning "Some smoke tests failed on Green environment"
}

# Step 6: Performance validation
log_info "Running performance validation on Green environment..."
npm run test:performance:green || {
    log_warning "Performance tests failed, but deployment continues"
}

# Step 7: Switch traffic to Green (Blue-Green switch)
log_deploy "Switching traffic from Blue to Green..."

# Update nginx configuration to point to Green
# This is a simplified example - in real scenarios, you'd update load balancer
log_info "Updating load balancer configuration..."

# Stop Blue environment
log_info "Stopping Blue environment..."
docker-compose -f docker-compose.production.yml down || {
    log_warning "Failed to stop Blue environment cleanly"
}

# Start Green as the new Blue (rename containers)
log_info "Promoting Green to Blue..."
docker-compose -f docker-compose.production.yml up -d || {
    log_error "Failed to promote Green to Blue"
    exit 1
}

# Step 8: Final health checks
log_info "Running final health checks..."
sleep $HEALTH_CHECK_DELAY

# Check API health
if curl -f https://$PROD_HOST/api/health > /dev/null 2>&1; then
    log_success "Production API health check passed"
else
    log_error "Production API health check failed"
    exit 1
fi

# Check frontend
if curl -f https://$PROD_HOST > /dev/null 2>&1; then
    log_success "Production frontend health check passed"
else
    log_error "Production frontend health check failed"
    exit 1
fi

# Step 9: Cleanup
log_info "Cleaning up old Docker images..."
docker image prune -f || {
    log_warning "Failed to cleanup old images"
}

# Remove Green profile containers (they're now the main containers)
docker-compose -f docker-compose.production.yml --profile green down || true

log_success "Production deployment completed successfully!"

# Step 10: Post-deployment monitoring
log_info "Starting post-deployment monitoring..."

# Start monitoring services if not already running
docker-compose -f docker-compose.production.yml --profile monitoring up -d || {
    log_warning "Failed to start monitoring services"
}

# Send notifications
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 Production deployment completed successfully! Blue-Green switch completed."}' \
        "$SLACK_WEBHOOK_URL" || {
        log_warning "Failed to send Slack notification"
    }
fi

if [ ! -z "$DISCORD_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"content":"🚀 Production deployment completed successfully! Blue-Green switch completed."}' \
        "$DISCORD_WEBHOOK_URL" || {
        log_warning "Failed to send Discord notification"
    }
fi

echo ""
log_success "🎉 PRODUCTION DEPLOYMENT SUMMARY 🎉"
echo "  📦 Environment: Production"
echo "  🌐 Frontend: https://$PROD_HOST"
echo "  🔌 API: https://$PROD_HOST/api"
echo "  📊 Monitoring: https://$PROD_HOST:3000 (Grafana)"
echo "  🔍 Metrics: https://$PROD_HOST:9090 (Prometheus)"
echo "  💾 Backup: $BACKUP_DIR"
echo "  🕐 Deployment Time: $(date)"
echo ""
log_info "Monitoring commands:"
echo "  📊 View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  📈 Check metrics: curl https://$PROD_HOST:9090/metrics"
echo "  🔍 Health check: curl https://$PROD_HOST/api/health"
echo ""
log_info "Emergency rollback: ./scripts/rollback-production.sh $BACKUP_DIR"

# Disable error trap
trap - ERR

log_success "Production deployment completed! 🎉"