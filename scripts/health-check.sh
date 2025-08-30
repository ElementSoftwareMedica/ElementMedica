#!/bin/bash

# Health Check Script for Document Management System
# Monitors all services and environments (blue/green)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/health-check.log"
CONFIG_FILE="$PROJECT_ROOT/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Default values
HEALTH_CHECK_TIMEOUT=${PRODUCTION_HEALTH_CHECK_TIMEOUT:-10}
MAX_RETRIES=3
RETRY_DELAY=5

# Services to check
declare -A SERVICES=(
    ["nginx"]="http://localhost:8080/health"
    ["api_blue"]="http://localhost:4000/health"
    ["api_green"]="http://localhost:4001/health"
    ["frontend_blue"]="http://localhost:3000/health"
    ["frontend_green"]="http://localhost:3001/health"
    ["docs_blue"]="http://localhost:4002/health"
    ["docs_green"]="http://localhost:4003/health"
    ["main_blue"]="http://localhost:3001/health"
    ["main_green"]="http://localhost:3002/health"
    ["postgres"]="postgresql://localhost:5432"
    ["redis"]="redis://localhost:6379"
    ["prometheus"]="http://localhost:9090/-/healthy"
    ["grafana"]="http://localhost:3000/api/health"
    ["alertmanager"]="http://localhost:9093/-/healthy"
)

# Critical services that must be healthy
CRITICAL_SERVICES=("nginx" "postgres" "redis")

# Initialize logging
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log "INFO" "$@"
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $*"
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

# Check if a service is healthy
check_service_health() {
    local service_name="$1"
    local service_url="$2"
    local retries=0
    
    while [[ $retries -lt $MAX_RETRIES ]]; do
        if [[ "$service_url" == postgresql://* ]]; then
            # PostgreSQL health check
            if pg_isready -h localhost -p 5432 -U "${PRODUCTION_DB_USER:-postgres}" >/dev/null 2>&1; then
                return 0
            fi
        elif [[ "$service_url" == redis://* ]]; then
            # Redis health check
            if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
                return 0
            fi
        else
            # HTTP health check
            if curl -f -s --max-time "$HEALTH_CHECK_TIMEOUT" "$service_url" >/dev/null 2>&1; then
                return 0
            fi
        fi
        
        retries=$((retries + 1))
        if [[ $retries -lt $MAX_RETRIES ]]; then
            log_warn "Health check failed for $service_name (attempt $retries/$MAX_RETRIES), retrying in ${RETRY_DELAY}s..."
            sleep "$RETRY_DELAY"
        fi
    done
    
    return 1
}

# Check Docker container status
check_container_status() {
    local container_name="$1"
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "^$container_name\s"; then
        local status=$(docker ps --format "{{.Status}}" --filter "name=$container_name")
        if [[ "$status" == *"Up"* ]]; then
            return 0
        fi
    fi
    
    return 1
}

# Get current active environment
get_active_environment() {
    # Check Nginx configuration to determine active environment
    if docker exec nginx grep -q "backend_blue" /etc/nginx/nginx.conf 2>/dev/null; then
        echo "blue"
    elif docker exec nginx grep -q "backend_green" /etc/nginx/nginx.conf 2>/dev/null; then
        echo "green"
    else
        echo "unknown"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log_error "Disk usage is critical: ${disk_usage}%"
        return 1
    elif [[ $disk_usage -gt 80 ]]; then
        log_warn "Disk usage is high: ${disk_usage}%"
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $memory_usage -gt 90 ]]; then
        log_error "Memory usage is critical: ${memory_usage}%"
        return 1
    elif [[ $memory_usage -gt 80 ]]; then
        log_warn "Memory usage is high: ${memory_usage}%"
    else
        log_success "Memory usage is normal: ${memory_usage}%"
    fi
    
    # Check CPU load
    local cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "$cpu_load * 100 / $cpu_cores" | bc -l | cut -d. -f1)
    
    if [[ $load_percentage -gt 90 ]]; then
        log_error "CPU load is critical: ${cpu_load} (${load_percentage}%)"
        return 1
    elif [[ $load_percentage -gt 80 ]]; then
        log_warn "CPU load is high: ${cpu_load} (${load_percentage}%)"
    else
        log_success "CPU load is normal: ${cpu_load} (${load_percentage}%)"
    fi
    
    return 0
}

# Check database connectivity and performance
check_database_health() {
    log_info "Checking database health..."
    
    # Basic connectivity
    if ! pg_isready -h localhost -p 5432 -U "${PRODUCTION_DB_USER:-postgres}" >/dev/null 2>&1; then
        log_error "Database is not accepting connections"
        return 1
    fi
    
    # Check for long-running queries
    local long_queries=$(docker exec postgres psql -U "${PRODUCTION_DB_USER:-postgres}" -d "${PRODUCTION_DB_NAME:-document_management_prod}" -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';" 2>/dev/null | xargs)
    
    if [[ $long_queries -gt 5 ]]; then
        log_warn "Found $long_queries long-running queries"
    fi
    
    # Check database size
    local db_size=$(docker exec postgres psql -U "${PRODUCTION_DB_USER:-postgres}" -d "${PRODUCTION_DB_NAME:-document_management_prod}" -t -c "SELECT pg_size_pretty(pg_database_size('${PRODUCTION_DB_NAME:-document_management_prod}'));" 2>/dev/null | xargs)
    log_info "Database size: $db_size"
    
    log_success "Database health check passed"
    return 0
}

# Check Redis health
check_redis_health() {
    log_info "Checking Redis health..."
    
    # Basic connectivity
    if ! redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
        log_error "Redis is not responding"
        return 1
    fi
    
    # Check memory usage
    local redis_memory=$(redis-cli -h localhost -p 6379 info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log_info "Redis memory usage: $redis_memory"
    
    # Check connected clients
    local connected_clients=$(redis-cli -h localhost -p 6379 info clients | grep connected_clients | cut -d: -f2 | tr -d '\r')
    log_info "Redis connected clients: $connected_clients"
    
    log_success "Redis health check passed"
    return 0
}

# Generate health report
generate_health_report() {
    local overall_status="$1"
    local failed_services=("${@:2}")
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local active_env=$(get_active_environment)
    
    local report_file="$PROJECT_ROOT/logs/health-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "overall_status": "$overall_status",
  "active_environment": "$active_env",
  "failed_services": [$(printf '"%s",' "${failed_services[@]}" | sed 's/,$//')]],
  "system_info": {
    "disk_usage": "$(df / | awk 'NR==2 {print $5}')",
    "memory_usage": "$(free | awk 'NR==2{printf "%.0f%%", $3*100/$2}')",
    "cpu_load": "$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')",
    "uptime": "$(uptime -p)"
  },
  "services_checked": $(echo "${!SERVICES[@]}" | wc -w),
  "services_healthy": $(($(echo "${!SERVICES[@]}" | wc -w) - ${#failed_services[@]})),
  "services_failed": ${#failed_services[@]}
}
EOF
    
    log_info "Health report generated: $report_file"
}

# Send notifications
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "CRITICAL" ]]; then
            color="danger"
        elif [[ "$status" == "WARNING" ]]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Health Check - $status\",
                    \"text\": \"$message\",
                    \"footer\": \"Document Management System\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # Email notification for critical issues
    if [[ "$status" == "CRITICAL" && -n "${PRODUCTION_SMTP_HOST:-}" ]]; then
        echo "$message" | mail -s "[CRITICAL] Health Check Alert - Document Management System" "${ALERT_EMAIL:-devops@yourdomain.com}" || true
    fi
}

# Main health check function
main() {
    local start_time=$(date +%s)
    log_info "Starting health check..."
    
    # Create logs directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    local failed_services=()
    local critical_failed=false
    local active_env=$(get_active_environment)
    
    log_info "Active environment: $active_env"
    
    # Check system resources first
    if ! check_system_resources; then
        critical_failed=true
    fi
    
    # Check each service
    for service in "${!SERVICES[@]}"; do
        local service_url="${SERVICES[$service]}"
        
        log_info "Checking $service..."
        
        # Skip inactive environment services
        if [[ "$service" == *"_blue" && "$active_env" == "green" ]]; then
            log_info "Skipping $service (inactive environment)"
            continue
        elif [[ "$service" == *"_green" && "$active_env" == "blue" ]]; then
            log_info "Skipping $service (inactive environment)"
            continue
        fi
        
        if check_service_health "$service" "$service_url"; then
            log_success "$service is healthy"
        else
            log_error "$service is unhealthy"
            failed_services+=("$service")
            
            # Check if this is a critical service
            for critical_service in "${CRITICAL_SERVICES[@]}"; do
                if [[ "$service" == "$critical_service" ]]; then
                    critical_failed=true
                    break
                fi
            done
        fi
    done
    
    # Additional specific health checks
    check_database_health || failed_services+=("database_detailed")
    check_redis_health || failed_services+=("redis_detailed")
    
    # Determine overall status
    local overall_status="HEALTHY"
    local notification_message="All services are healthy"
    
    if [[ $critical_failed == true ]]; then
        overall_status="CRITICAL"
        notification_message="Critical services are failing: ${failed_services[*]}"
    elif [[ ${#failed_services[@]} -gt 0 ]]; then
        overall_status="WARNING"
        notification_message="Some services are failing: ${failed_services[*]}"
    fi
    
    # Generate report
    generate_health_report "$overall_status" "${failed_services[@]}"
    
    # Send notifications
    send_notification "$overall_status" "$notification_message"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Health check completed in ${duration}s"
    log_info "Overall status: $overall_status"
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_error "Failed services: ${failed_services[*]}"
    fi
    
    # Exit with appropriate code
    if [[ "$overall_status" == "CRITICAL" ]]; then
        exit 2
    elif [[ "$overall_status" == "WARNING" ]]; then
        exit 1
    else
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --quiet, -q    Suppress output (logs only)"
        echo "  --verbose, -v  Verbose output"
        echo "  --json         Output results in JSON format"
        exit 0
        ;;
    --quiet|-q)
        exec > /dev/null
        ;;
    --verbose|-v)
        set -x
        ;;
    --json)
        # JSON output mode - suppress regular output
        exec 3>&1 1>/dev/null
        trap 'generate_health_report "$overall_status" "${failed_services[@]}" >&3' EXIT
        ;;
esac

# Run main function
main "$@"