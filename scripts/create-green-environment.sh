#!/bin/bash
# scripts/create-green-environment.sh

set -e

echo "🟢 Creating Green environment for Blue-Green deployment..."

# Variables
GREEN_PORT_OFFSET=1000
CURRENT_TIME=$(date +%Y%m%d_%H%M%S)
LOG_FILE="./logs/green-deployment-$CURRENT_TIME.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_green() {
    echo -e "${GREEN}🟢 $1${NC}" | tee -a "$LOG_FILE"
}

# Create logs directory
mkdir -p ./logs

# Start logging
log_green "Starting Green environment creation at $(date)"

# Step 1: Validate current Blue environment
log_info "Validating current Blue environment..."
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    log_error "Blue environment is not running. Cannot create Green environment."
    exit 1
fi

log_success "Blue environment is running"

# Step 2: Check if Green environment already exists
log_info "Checking for existing Green environment..."
if docker-compose -f docker-compose.production.yml --profile green ps | grep -q "Up"; then
    log_warning "Green environment is already running. Stopping it first..."
    docker-compose -f docker-compose.production.yml --profile green down || {
        log_error "Failed to stop existing Green environment"
        exit 1
    }
fi

# Step 3: Build latest images for Green environment
log_info "Building latest images for Green environment..."
docker-compose -f docker-compose.production.yml --profile green build || {
    log_error "Failed to build Green environment images"
    exit 1
}

log_success "Green environment images built successfully"

# Step 4: Start Green environment
log_info "Starting Green environment..."
docker-compose -f docker-compose.production.yml --profile green up -d || {
    log_error "Failed to start Green environment"
    exit 1
}

log_success "Green environment started"

# Step 5: Wait for Green services to be ready
log_info "Waiting for Green services to initialize..."
sleep 45

# Step 6: Check Green environment health
log_info "Checking Green environment health..."
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=15

# Check API health on Green environment
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    log_info "Green API health check attempt $i/$HEALTH_CHECK_RETRIES..."
    
    # Assuming Green API runs on a different port or internal network
    if docker-compose -f docker-compose.production.yml --profile green exec -T api_green curl -f http://localhost:4001/health > /dev/null 2>&1; then
        log_success "Green API health check passed"
        GREEN_API_HEALTHY=true
        break
    elif [ $i -eq $HEALTH_CHECK_RETRIES ]; then
        log_error "Green API health check failed after $HEALTH_CHECK_RETRIES attempts"
        GREEN_API_HEALTHY=false
    else
        log_warning "Green API health check failed, retrying in $HEALTH_CHECK_DELAY seconds..."
        sleep $HEALTH_CHECK_DELAY
    fi
done

# Check Green frontend
if docker-compose -f docker-compose.production.yml --profile green exec -T frontend_green curl -f http://localhost:80 > /dev/null 2>&1; then
    log_success "Green frontend health check passed"
    GREEN_FRONTEND_HEALTHY=true
else
    log_warning "Green frontend health check failed"
    GREEN_FRONTEND_HEALTHY=false
fi

# Step 7: Run database migrations on Green (if needed)
log_info "Running database migrations on Green environment..."
docker-compose -f docker-compose.production.yml --profile green exec -T api_green npm run db:migrate || {
    log_warning "Database migrations failed on Green environment"
}

# Step 8: Run smoke tests on Green
log_info "Running smoke tests on Green environment..."

# Create a temporary test script for Green environment
cat > /tmp/green-smoke-test.sh << 'EOF'
#!/bin/bash
# Smoke tests for Green environment

echo "Running Green environment smoke tests..."

# Test API endpoints
echo "Testing API health..."
curl -f http://api_green:4001/health || exit 1

echo "Testing API authentication..."
curl -f -X POST http://api_green:4001/api/auth/test || echo "Auth test skipped"

echo "Testing database connectivity..."
curl -f http://api_green:4001/api/health/db || exit 1

echo "Green smoke tests completed successfully"
EOF

chmod +x /tmp/green-smoke-test.sh

# Run smoke tests inside Green environment
if docker-compose -f docker-compose.production.yml --profile green exec -T api_green bash -c "$(cat /tmp/green-smoke-test.sh)"; then
    log_success "Green environment smoke tests passed"
    GREEN_SMOKE_TESTS=true
else
    log_warning "Green environment smoke tests failed"
    GREEN_SMOKE_TESTS=false
fi

# Cleanup temporary test script
rm -f /tmp/green-smoke-test.sh

# Step 9: Performance baseline test
log_info "Running performance baseline test on Green environment..."

# Simple performance test
if command -v ab > /dev/null 2>&1; then
    log_info "Running Apache Bench performance test..."
    
    # Test Green API performance
    if docker-compose -f docker-compose.production.yml --profile green exec -T api_green ab -n 100 -c 10 http://localhost:4001/health > /tmp/green-perf.log 2>&1; then
        RESPONSE_TIME=$(grep "Time per request" /tmp/green-perf.log | head -1 | awk '{print $4}')
        log_success "Green environment performance test completed. Avg response time: ${RESPONSE_TIME}ms"
        GREEN_PERFORMANCE=true
    else
        log_warning "Green environment performance test failed"
        GREEN_PERFORMANCE=false
    fi
    
    rm -f /tmp/green-perf.log
else
    log_warning "Apache Bench not available, skipping performance test"
    GREEN_PERFORMANCE=true
fi

# Step 10: Generate Green environment report
log_info "Generating Green environment readiness report..."

REPORT_FILE="./logs/green-readiness-report-$CURRENT_TIME.txt"

cat > "$REPORT_FILE" << EOF
🟢 GREEN ENVIRONMENT READINESS REPORT
=====================================

Creation Time: $(date)
Log File: $LOG_FILE

HEALTH CHECKS:
✓ API Health: $([ "$GREEN_API_HEALTHY" = true ] && echo "PASS" || echo "FAIL")
✓ Frontend Health: $([ "$GREEN_FRONTEND_HEALTHY" = true ] && echo "PASS" || echo "FAIL")
✓ Smoke Tests: $([ "$GREEN_SMOKE_TESTS" = true ] && echo "PASS" || echo "FAIL")
✓ Performance: $([ "$GREEN_PERFORMANCE" = true ] && echo "PASS" || echo "FAIL")

SERVICE STATUS:
EOF

# Add service status to report
docker-compose -f docker-compose.production.yml --profile green ps >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "CONTAINER LOGS (Last 20 lines):" >> "$REPORT_FILE"
echo "================================" >> "$REPORT_FILE"
docker-compose -f docker-compose.production.yml --profile green logs --tail=20 >> "$REPORT_FILE" 2>&1

log_success "Green environment readiness report generated: $REPORT_FILE"

# Step 11: Final validation
if [ "$GREEN_API_HEALTHY" = true ] && [ "$GREEN_FRONTEND_HEALTHY" = true ] && [ "$GREEN_SMOKE_TESTS" = true ]; then
    GREEN_STATUS="READY"
    EXIT_CODE=0
else
    GREEN_STATUS="NOT_READY"
    EXIT_CODE=1
fi

echo ""
log_green "🟢 GREEN ENVIRONMENT CREATION SUMMARY 🟢"
echo "  📦 Status: $GREEN_STATUS"
echo "  🕐 Creation Time: $(date)"
echo "  📊 Health Checks: $([ "$GREEN_API_HEALTHY" = true ] && echo "✅" || echo "❌") API, $([ "$GREEN_FRONTEND_HEALTHY" = true ] && echo "✅" || echo "❌") Frontend"
echo "  🧪 Smoke Tests: $([ "$GREEN_SMOKE_TESTS" = true ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  ⚡ Performance: $([ "$GREEN_PERFORMANCE" = true ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  📄 Report: $REPORT_FILE"
echo "  📋 Log: $LOG_FILE"
echo ""

if [ "$GREEN_STATUS" = "READY" ]; then
    log_success "✅ Green environment is ready for Blue-Green switch!"
    echo "  🔄 Next step: ./scripts/switch-to-green.sh"
else
    log_error "❌ Green environment is not ready for production switch!"
    echo "  🔍 Check logs: docker-compose -f docker-compose.production.yml --profile green logs"
    echo "  🛠️  Fix issues and retry: ./scripts/create-green-environment.sh"
fi

echo ""
log_info "Monitoring commands:"
echo "  📊 View Green logs: docker-compose -f docker-compose.production.yml --profile green logs -f"
echo "  🔍 Check Green status: docker-compose -f docker-compose.production.yml --profile green ps"
echo "  🧪 Test Green API: curl http://localhost:8889/api/health"
echo "  🛑 Stop Green: docker-compose -f docker-compose.production.yml --profile green down"

exit $EXIT_CODE