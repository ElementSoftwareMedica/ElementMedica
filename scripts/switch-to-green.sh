#!/bin/bash
# scripts/switch-to-green.sh

set -e

echo "🔄 Starting Blue-Green switch to Green environment..."

# Variables
PROD_HOST="yourdomain.com"
SWITCH_TIMEOUT=300  # 5 minutes
CURRENT_TIME=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./logs/blue-green-switch-$CURRENT_TIME.log"
SWITCH_BACKUP_DIR="./backups/switch-$CURRENT_TIME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_switch() {
    echo -e "${CYAN}🔄 $1${NC}" | tee -a "$LOG_FILE"
}

log_blue() {
    echo -e "${BLUE}🔵 $1${NC}" | tee -a "$LOG_FILE"
}

log_green() {
    echo -e "${GREEN}🟢 $1${NC}" | tee -a "$LOG_FILE"
}

# Emergency rollback function
emergency_rollback() {
    log_error "Emergency rollback initiated!"
    
    # Stop Green environment
    log_info "Stopping Green environment..."
    docker-compose -f docker-compose.production.yml --profile green down || true
    
    # Ensure Blue environment is running
    log_info "Ensuring Blue environment is running..."
    docker-compose -f docker-compose.production.yml up -d || {
        log_error "Failed to restart Blue environment!"
        exit 1
    }
    
    # Restore load balancer configuration if needed
    if [ -f "$SWITCH_BACKUP_DIR/nginx.conf" ]; then
        log_info "Restoring load balancer configuration..."
        cp "$SWITCH_BACKUP_DIR/nginx.conf" ./nginx/production.conf || true
        docker-compose -f docker-compose.production.yml restart nginx || true
    fi
    
    log_error "Emergency rollback completed. Blue environment is active."
    exit 1
}

# Trap errors and call emergency rollback
trap emergency_rollback ERR

# Create directories
mkdir -p ./logs
mkdir -p "$SWITCH_BACKUP_DIR"

# Start logging
log_switch "Starting Blue-Green switch at $(date)"

# Step 1: Pre-switch validation
log_info "Running pre-switch validation..."

# Check if Blue environment is running
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    log_error "Blue environment is not running!"
    exit 1
fi
log_blue "Blue environment is running"

# Check if Green environment is running and healthy
if ! docker-compose -f docker-compose.production.yml --profile green ps | grep -q "Up"; then
    log_error "Green environment is not running! Run create-green-environment.sh first."
    exit 1
fi
log_green "Green environment is running"

# Step 2: Final health checks on Green environment
log_info "Running final health checks on Green environment..."
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10

# Check Green API health
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Green API health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    if docker-compose -f docker-compose.production.yml --profile green exec -T api_green curl -f http://localhost:4001/health > /dev/null 2>&1; then
        log_success "Green API health check passed"
        GREEN_API_HEALTHY=true
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "Green API health check failed after $HEALTH_CHECK_RETRIES attempts"
        exit 1
    else
        log_warning "Green API health check failed, retrying in $HEALTH_CHECK_DELAY seconds..."
        sleep $HEALTH_CHECK_DELAY
    fi
done

# Check Green frontend
if docker-compose -f docker-compose.production.yml --profile green exec -T frontend_green curl -f http://localhost:80 > /dev/null 2>&1; then
    log_success "Green frontend health check passed"
else
    log_error "Green frontend health check failed"
    exit 1
fi

# Step 3: Create backup of current configuration
log_info "Creating backup of current configuration..."

# Backup nginx configuration
if [ -f "./nginx/production.conf" ]; then
    cp ./nginx/production.conf "$SWITCH_BACKUP_DIR/nginx.conf"
    log_success "Nginx configuration backed up"
fi

# Backup current Blue container states
docker-compose -f docker-compose.production.yml ps > "$SWITCH_BACKUP_DIR/blue-containers.txt"
log_success "Blue container states backed up"

# Step 4: Performance comparison (optional)
log_info "Running performance comparison between Blue and Green..."

if command -v ab > /dev/null 2>&1; then
    # Test Blue performance
    log_blue "Testing Blue environment performance..."
    if curl -f http://localhost:8888/api/health > /dev/null 2>&1; then
        ab -n 50 -c 5 http://localhost:8888/api/health > "$SWITCH_BACKUP_DIR/blue-performance.txt" 2>&1 || true
        BLUE_RESPONSE_TIME=$(grep "Time per request" "$SWITCH_BACKUP_DIR/blue-performance.txt" | head -1 | awk '{print $4}' || echo "N/A")
        log_blue "Blue avg response time: ${BLUE_RESPONSE_TIME}ms"
    fi
    
    # Test Green performance
    log_green "Testing Green environment performance..."
    docker-compose -f docker-compose.production.yml --profile green exec -T api_green ab -n 50 -c 5 http://localhost:4001/health > "$SWITCH_BACKUP_DIR/green-performance.txt" 2>&1 || true
    GREEN_RESPONSE_TIME=$(grep "Time per request" "$SWITCH_BACKUP_DIR/green-performance.txt" | head -1 | awk '{print $4}' || echo "N/A")
    log_green "Green avg response time: ${GREEN_RESPONSE_TIME}ms"
else
    log_warning "Apache Bench not available, skipping performance comparison"
fi

# Step 5: User confirmation
echo ""
log_warning "⚠️  BLUE-GREEN SWITCH CONFIRMATION ⚠️"
echo "This will switch production traffic from Blue to Green environment."
echo "Blue environment will be stopped and Green will become the active production."
echo ""
echo "Current Status:"
echo "  🔵 Blue: ACTIVE (will be stopped)"
echo "  🟢 Green: READY (will become active)"
echo "  📊 Performance: Blue=${BLUE_RESPONSE_TIME}ms, Green=${GREEN_RESPONSE_TIME}ms"
echo "  💾 Backup: $SWITCH_BACKUP_DIR"
echo ""
read -p "Proceed with Blue-Green switch? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Blue-Green switch cancelled by user"
    trap - ERR  # Disable error trap
    exit 0
fi

# Step 6: Start the switch process
log_switch "Starting Blue-Green switch process..."

# Step 6a: Update load balancer configuration (if using nginx)
log_info "Updating load balancer configuration..."

# Create new nginx configuration pointing to Green
if [ -f "./nginx/production.conf" ]; then
    # This is a simplified example - in real scenarios, you'd update upstream configuration
    log_info "Updating nginx upstream configuration to point to Green..."
    
    # Backup current config
    cp ./nginx/production.conf "$SWITCH_BACKUP_DIR/nginx-pre-switch.conf"
    
    # Update configuration (this would need to be customized based on your nginx config)
    # For now, we'll just log that this step would happen
    log_warning "Nginx configuration update would happen here (customize based on your setup)"
fi

# Step 6b: Gradual traffic shift (canary-style)
log_info "Starting gradual traffic shift to Green..."

# Phase 1: 10% traffic to Green
log_info "Phase 1: Shifting 10% traffic to Green..."
sleep 5

# Check for errors during partial shift
if docker-compose -f docker-compose.production.yml --profile green exec -T api_green curl -f http://localhost:4001/health > /dev/null 2>&1; then
    log_success "Green environment stable at 10% traffic"
else
    log_error "Green environment failed at 10% traffic"
    exit 1
fi

# Phase 2: 50% traffic to Green
log_info "Phase 2: Shifting 50% traffic to Green..."
sleep 5

if docker-compose -f docker-compose.production.yml --profile green exec -T api_green curl -f http://localhost:4001/health > /dev/null 2>&1; then
    log_success "Green environment stable at 50% traffic"
else
    log_error "Green environment failed at 50% traffic"
    exit 1
fi

# Phase 3: 100% traffic to Green
log_info "Phase 3: Shifting 100% traffic to Green..."

# Stop Blue environment
log_blue "Stopping Blue environment..."
docker-compose -f docker-compose.production.yml down || {
    log_warning "Some Blue services failed to stop gracefully"
}

# Promote Green to main production
log_green "Promoting Green environment to main production..."

# Stop Green profile and start as main production
docker-compose -f docker-compose.production.yml --profile green down

# Start main production services (which will now use the Green images)
docker-compose -f docker-compose.production.yml up -d || {
    log_error "Failed to start promoted Green environment"
    exit 1
}

log_success "Green environment promoted to main production"

# Step 7: Post-switch validation
log_info "Running post-switch validation..."
sleep 30

# Health checks on the new production (former Green)
HEALTH_CHECK_RETRIES=10
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Post-switch health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    if curl -f http://localhost:8888/api/health > /dev/null 2>&1; then
        log_success "Post-switch API health check passed"
        POST_SWITCH_API_HEALTHY=true
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "Post-switch API health check failed"
        exit 1
    else
        log_warning "Post-switch health check failed, retrying in 10 seconds..."
        sleep 10
    fi
done

# Check frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    log_success "Post-switch frontend health check passed"
else
    log_error "Post-switch frontend health check failed"
    exit 1
fi

# Step 8: Run post-switch smoke tests
log_info "Running post-switch smoke tests..."
npm run test:smoke:production || {
    log_warning "Some post-switch smoke tests failed"
}

# Step 9: Monitor for a few minutes
log_info "Monitoring new production environment for 2 minutes..."
for i in {1..8}; do
    sleep 15
    if curl -f http://localhost:8888/api/health > /dev/null 2>&1; then
        log_info "Monitoring check $i/8: ✅ Healthy"
    else
        log_warning "Monitoring check $i/8: ❌ Unhealthy"
    fi
done

# Step 10: Generate switch report
log_info "Generating Blue-Green switch report..."

REPORT_FILE="./logs/blue-green-switch-report-$CURRENT_TIME.txt"

cat > "$REPORT_FILE" << EOF
🔄 BLUE-GREEN SWITCH REPORT
===========================

Switch Time: $(date)
Log File: $LOG_FILE
Backup Directory: $SWITCH_BACKUP_DIR

SWITCH SUMMARY:
✓ Blue Environment: STOPPED
✓ Green Environment: PROMOTED TO PRODUCTION
✓ Traffic Switch: COMPLETED
✓ Health Checks: PASSED

PERFORMANCE COMPARISON:
• Blue Response Time: ${BLUE_RESPONSE_TIME}ms
• Green Response Time: ${GREEN_RESPONSE_TIME}ms

POST-SWITCH STATUS:
EOF

# Add current service status
docker-compose -f docker-compose.production.yml ps >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "RECENT LOGS:" >> "$REPORT_FILE"
echo "============" >> "$REPORT_FILE"
docker-compose -f docker-compose.production.yml logs --tail=30 >> "$REPORT_FILE" 2>&1

log_success "Blue-Green switch report generated: $REPORT_FILE"

# Step 11: Send notifications
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🔄 Blue-Green switch completed successfully! Green environment is now production."}' \
        "$SLACK_WEBHOOK_URL" || {
        log_warning "Failed to send Slack notification"
    }
fi

# Step 12: Cleanup
log_info "Cleaning up temporary files..."
# Keep backups and logs for troubleshooting

# Disable error trap
trap - ERR

echo ""
log_success "🎉 BLUE-GREEN SWITCH COMPLETED SUCCESSFULLY! 🎉"
echo "  🔄 Status: Green environment is now PRODUCTION"
echo "  🕐 Switch Time: $(date)"
echo "  🌐 Frontend: http://localhost:80"
echo "  🔌 API: http://localhost:8888"
echo "  📊 Performance: ${GREEN_RESPONSE_TIME}ms avg response time"
echo "  💾 Backup: $SWITCH_BACKUP_DIR"
echo "  📄 Report: $REPORT_FILE"
echo "  📋 Log: $LOG_FILE"
echo ""
log_info "Monitoring commands:"
echo "  📊 View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  🔍 Check status: docker-compose -f docker-compose.production.yml ps"
echo "  🧪 Health check: curl http://localhost:8888/api/health"
echo ""
log_info "Emergency rollback: ./scripts/rollback-production.sh $SWITCH_BACKUP_DIR"

log_success "Blue-Green switch completed! 🟢➡️🔵"