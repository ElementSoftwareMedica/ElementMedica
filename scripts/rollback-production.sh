#!/bin/bash
# scripts/rollback-production.sh

set -e

echo "🔄 Starting production rollback..."

# Variables
BACKUP_DIR="$1"
PROD_HOST="yourdomain.com"
ROLLBACK_TIMEOUT=300  # 5 minutes

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

log_rollback() {
    echo -e "${PURPLE}🔄 $1${NC}"
}

# Validate backup directory
if [ -z "$BACKUP_DIR" ]; then
    log_error "Usage: $0 <backup_directory>"
    log_info "Example: $0 /var/backups/production/20250131_143022"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory does not exist: $BACKUP_DIR"
    exit 1
fi

log_info "Using backup directory: $BACKUP_DIR"

# Confirmation prompt
echo ""
log_warning "⚠️  PRODUCTION ROLLBACK WARNING ⚠️"
echo "This will rollback the production environment to a previous state."
echo "Backup directory: $BACKUP_DIR"
echo "Production host: $PROD_HOST"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Rollback cancelled by user"
    exit 0
fi

# Start rollback process
log_rollback "Starting production rollback process..."

# Step 1: Stop current production services
log_info "Stopping current production services..."
docker-compose -f docker-compose.production.yml down || {
    log_warning "Some services failed to stop gracefully"
}

# Stop monitoring services
docker-compose -f docker-compose.production.yml --profile monitoring down || {
    log_warning "Failed to stop monitoring services"
}

# Step 2: Restore configuration files
log_info "Restoring configuration files..."
if [ -f "$BACKUP_DIR/docker-compose.production.yml" ]; then
    cp "$BACKUP_DIR/docker-compose.production.yml" ./docker-compose.production.yml
    log_success "Docker Compose configuration restored"
else
    log_warning "Docker Compose backup not found, using current configuration"
fi

if [ -d "$BACKUP_DIR/nginx" ]; then
    rm -rf nginx/ 2>/dev/null || true
    cp -r "$BACKUP_DIR/nginx" ./
    log_success "Nginx configuration restored"
else
    log_warning "Nginx configuration backup not found"
fi

if [ -d "$BACKUP_DIR/ssl" ]; then
    rm -rf ssl/ 2>/dev/null || true
    cp -r "$BACKUP_DIR/ssl" ./
    log_success "SSL certificates restored"
else
    log_warning "SSL certificates backup not found"
fi

# Step 3: Restore database
log_info "Restoring database..."
if [ -f "$BACKUP_DIR/database.sql" ]; then
    # Start only PostgreSQL for restoration
    docker-compose -f docker-compose.production.yml up -d postgres
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 30
    
    # Create a backup of current database before restoration
    CURRENT_BACKUP="/tmp/current_db_$(date +%Y%m%d_%H%M%S).sql"
    log_info "Creating backup of current database: $CURRENT_BACKUP"
    docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U "$PROD_DB_USER" document_management > "$CURRENT_BACKUP" || {
        log_warning "Failed to backup current database"
    }
    
    # Drop and recreate database
    log_info "Dropping and recreating database..."
    docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" -c "DROP DATABASE IF EXISTS document_management;"
    docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" -c "CREATE DATABASE document_management;"
    
    # Restore database from backup
    log_info "Restoring database from backup..."
    docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" document_management < "$BACKUP_DIR/database.sql" || {
        log_error "Database restoration failed"
        
        # Attempt to restore current backup
        if [ -f "$CURRENT_BACKUP" ]; then
            log_info "Attempting to restore current database backup..."
            docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" -c "DROP DATABASE IF EXISTS document_management;"
            docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" -c "CREATE DATABASE document_management;"
            docker-compose -f docker-compose.production.yml exec -T postgres psql -U "$PROD_DB_USER" document_management < "$CURRENT_BACKUP"
        fi
        
        exit 1
    }
    
    log_success "Database restored successfully"
else
    log_error "Database backup not found: $BACKUP_DIR/database.sql"
    exit 1
fi

# Step 4: Start services with previous configuration
log_info "Starting services with restored configuration..."
docker-compose -f docker-compose.production.yml up -d || {
    log_error "Failed to start services with restored configuration"
    exit 1
}

# Step 5: Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 60

# Step 6: Health checks
log_info "Running health checks..."
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=30

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    # Check API health
    if curl -f https://$PROD_HOST/api/health > /dev/null 2>&1; then
        log_success "API health check passed"
        API_HEALTHY=true
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "API health check failed after $HEALTH_CHECK_RETRIES attempts"
        API_HEALTHY=false
    else
        log_warning "Health check failed, retrying in $HEALTH_CHECK_DELAY seconds..."
        sleep $HEALTH_CHECK_DELAY
    fi
done

# Check frontend
if curl -f https://$PROD_HOST > /dev/null 2>&1; then
    log_success "Frontend health check passed"
    FRONTEND_HEALTHY=true
else
    log_warning "Frontend health check failed"
    FRONTEND_HEALTHY=false
fi

# Step 7: Restart monitoring services
log_info "Restarting monitoring services..."
docker-compose -f docker-compose.production.yml --profile monitoring up -d || {
    log_warning "Failed to start monitoring services"
}

# Step 8: Final validation
if [ "$API_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
    log_success "Rollback completed successfully!"
    ROLLBACK_STATUS="SUCCESS"
else
    log_error "Rollback completed but some services are not healthy"
    ROLLBACK_STATUS="PARTIAL"
fi

# Step 9: Send notifications
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    if [ "$ROLLBACK_STATUS" = "SUCCESS" ]; then
        MESSAGE="🔄 Production rollback completed successfully! System restored to backup: $(basename $BACKUP_DIR)"
    else
        MESSAGE="⚠️ Production rollback completed with issues! Manual intervention may be required. Backup: $(basename $BACKUP_DIR)"
    fi
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$MESSAGE\"}" \
        "$SLACK_WEBHOOK_URL" || {
        log_warning "Failed to send Slack notification"
    }
fi

# Step 10: Cleanup
log_info "Cleaning up temporary files..."
rm -f /tmp/current_db_*.sql 2>/dev/null || true

echo ""
log_success "🔄 PRODUCTION ROLLBACK SUMMARY 🔄"
echo "  📦 Environment: Production"
echo "  🔄 Status: $ROLLBACK_STATUS"
echo "  💾 Backup Used: $BACKUP_DIR"
echo "  🌐 Frontend: https://$PROD_HOST"
echo "  🔌 API: https://$PROD_HOST/api"
echo "  🕐 Rollback Time: $(date)"
echo ""

if [ "$ROLLBACK_STATUS" = "SUCCESS" ]; then
    log_success "✅ Rollback completed successfully!"
    echo "  📊 Monitoring: https://$PROD_HOST:3000 (Grafana)"
    echo "  🔍 Metrics: https://$PROD_HOST:9090 (Prometheus)"
else
    log_warning "⚠️ Rollback completed with issues!"
    echo "  🔍 Check logs: docker-compose -f docker-compose.production.yml logs"
    echo "  🔧 Manual intervention may be required"
fi

echo ""
log_info "Monitoring commands:"
echo "  📊 View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  📈 Check metrics: curl https://$PROD_HOST:9090/metrics"
echo "  🔍 Health check: curl https://$PROD_HOST/api/health"
echo ""

if [ "$ROLLBACK_STATUS" = "SUCCESS" ]; then
    exit 0
else
    exit 1
fi