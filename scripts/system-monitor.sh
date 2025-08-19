#!/bin/bash

# ElementMedica 2.0 - System Health Monitor
# Automated system monitoring and alerting script
# Usage: ./system-monitor.sh [--check-all|--check-services|--check-resources|--check-security]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/elementmedica/system-monitor.log"
ALERT_EMAIL="admin@elementmedica.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
CHECK_INTERVAL=300  # 5 minutes

# Service endpoints
API_ENDPOINT="http://localhost:4001/health"
PROXY_ENDPOINT="http://localhost:4003/health"
FRONTEND_ENDPOINT="http://localhost:5173"
DATABASE_HOST="localhost"
DATABASE_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
LOAD_THRESHOLD=5.0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Alert function
send_alert() {
    local severity="$1"
    local service="$2"
    local message="$3"
    
    log "ALERT" "[$severity] $service: $message"
    
    # Send email alert if configured
    if command -v mail >/dev/null 2>&1 && [[ -n "$ALERT_EMAIL" ]]; then
        echo "ElementMedica Alert: [$severity] $service - $message" | \
            mail -s "ElementMedica System Alert" "$ALERT_EMAIL"
    fi
    
    # Send Slack alert if configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 ElementMedica Alert: [$severity] $service - $message\"}" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || true
    fi
}

# Check system resources
check_system_resources() {
    log "INFO" "Checking system resources..."
    
    # Check CPU usage
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "CPU" "High CPU usage: ${cpu_usage}%"
    else
        log "INFO" "CPU usage: ${cpu_usage}% (OK)"
    fi
    
    # Check memory usage
    local memory_info
    memory_info=$(free | grep Mem)
    local total_mem=$(echo $memory_info | awk '{print $2}')
    local used_mem=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$(echo "scale=2; $used_mem * 100 / $total_mem" | bc)
    
    if (( $(echo "$memory_usage > $MEMORY_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "MEMORY" "High memory usage: ${memory_usage}%"
    else
        log "INFO" "Memory usage: ${memory_usage}% (OK)"
    fi
    
    # Check disk usage
    while IFS= read -r line; do
        local usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
        local mount=$(echo "$line" | awk '{print $6}')
        
        if [[ "$usage" =~ ^[0-9]+$ ]] && (( usage > DISK_THRESHOLD )); then
            send_alert "CRITICAL" "DISK" "High disk usage on $mount: ${usage}%"
        else
            log "INFO" "Disk usage on $mount: ${usage}% (OK)"
        fi
    done < <(df -h | grep -E '^/dev/')
    
    # Check system load
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    if (( $(echo "$load_avg > $LOAD_THRESHOLD" | bc -l) )); then
        send_alert "WARNING" "LOAD" "High system load: $load_avg"
    else
        log "INFO" "System load: $load_avg (OK)"
    fi
}

# Check ElementMedica services
check_elementmedica_services() {
    log "INFO" "Checking ElementMedica services..."
    
    # Check API Server
    if curl -f -s "$API_ENDPOINT" >/dev/null 2>&1; then
        log "INFO" "API Server: UP"
    else
        send_alert "CRITICAL" "API_SERVER" "API Server is DOWN or not responding"
    fi
    
    # Check Proxy Server
    if curl -f -s "$PROXY_ENDPOINT" >/dev/null 2>&1; then
        log "INFO" "Proxy Server: UP"
    else
        send_alert "CRITICAL" "PROXY_SERVER" "Proxy Server is DOWN or not responding"
    fi
    
    # Check Frontend (basic connectivity)
    if curl -f -s "$FRONTEND_ENDPOINT" >/dev/null 2>&1; then
        log "INFO" "Frontend: UP"
    else
        send_alert "WARNING" "FRONTEND" "Frontend is not responding"
    fi
    
    # Check PostgreSQL
    if pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" >/dev/null 2>&1; then
        log "INFO" "PostgreSQL: UP"
    else
        send_alert "CRITICAL" "POSTGRESQL" "PostgreSQL is DOWN or not responding"
    fi
    
    # Check Redis
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        log "INFO" "Redis: UP"
    else
        send_alert "CRITICAL" "REDIS" "Redis is DOWN or not responding"
    fi
    
    # Check Docker containers
    if command -v docker >/dev/null 2>&1; then
        local failed_containers
        failed_containers=$(docker ps -a --filter "name=elementmedica" --filter "status=exited" --format "{{.Names}}" 2>/dev/null || true)
        
        if [[ -n "$failed_containers" ]]; then
            send_alert "WARNING" "DOCKER" "Failed containers: $failed_containers"
        else
            log "INFO" "Docker containers: All running"
        fi
    fi
}

# Check security metrics
check_security() {
    log "INFO" "Checking security metrics..."
    
    # Check for failed login attempts
    local failed_logins
    failed_logins=$(grep -c "Failed login" "$LOG_FILE" 2>/dev/null || echo "0")
    
    if (( failed_logins > 50 )); then
        send_alert "WARNING" "SECURITY" "High number of failed login attempts: $failed_logins"
    fi
    
    # Check for suspicious network activity
    local suspicious_connections
    suspicious_connections=$(netstat -an | grep -c ":22.*ESTABLISHED" 2>/dev/null || echo "0")
    
    if (( suspicious_connections > 10 )); then
        send_alert "WARNING" "SECURITY" "High number of SSH connections: $suspicious_connections"
    fi
    
    # Check SSL certificate expiration
    if command -v openssl >/dev/null 2>&1; then
        local cert_file="/etc/ssl/certs/elementmedica.crt"
        if [[ -f "$cert_file" ]]; then
            local expiry_date
            expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
            local expiry_timestamp
            expiry_timestamp=$(date -d "$expiry_date" +%s)
            local current_timestamp
            current_timestamp=$(date +%s)
            local days_until_expiry
            days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
            
            if (( days_until_expiry < 30 )); then
                send_alert "WARNING" "SSL" "SSL certificate expires in $days_until_expiry days"
            fi
        fi
    fi
}

# Check application metrics
check_application_metrics() {
    log "INFO" "Checking application metrics..."
    
    # Check API response time
    local response_time
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$API_ENDPOINT" 2>/dev/null || echo "999")
    
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        send_alert "WARNING" "PERFORMANCE" "High API response time: ${response_time}s"
    else
        log "INFO" "API response time: ${response_time}s (OK)"
    fi
    
    # Check database connections
    if command -v psql >/dev/null 2>&1; then
        local db_connections
        db_connections=$(psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U postgres -d elementmedica -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "0")
        
        if (( db_connections > 80 )); then
            send_alert "WARNING" "DATABASE" "High number of database connections: $db_connections"
        else
            log "INFO" "Database connections: $db_connections (OK)"
        fi
    fi
}

# Generate health report
generate_health_report() {
    local report_file="/tmp/elementmedica-health-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "ElementMedica 2.0 - System Health Report"
        echo "Generated: $(date)"
        echo "========================================"
        echo ""
        
        echo "System Resources:"
        echo "- CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "- Memory Usage: $(free -h | grep Mem | awk '{print $3"/"$2}')"
        echo "- Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
        echo "- Load Average: $(uptime | awk -F'load average:' '{print $2}')"
        echo ""
        
        echo "Services Status:"
        curl -f -s "$API_ENDPOINT" >/dev/null 2>&1 && echo "- API Server: UP" || echo "- API Server: DOWN"
        curl -f -s "$PROXY_ENDPOINT" >/dev/null 2>&1 && echo "- Proxy Server: UP" || echo "- Proxy Server: DOWN"
        pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" >/dev/null 2>&1 && echo "- PostgreSQL: UP" || echo "- PostgreSQL: DOWN"
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1 && echo "- Redis: UP" || echo "- Redis: DOWN"
        echo ""
        
        if command -v docker >/dev/null 2>&1; then
            echo "Docker Containers:"
            docker ps --filter "name=elementmedica" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not available"
            echo ""
        fi
        
        echo "Recent Alerts (last 24 hours):"
        grep "ALERT" "$LOG_FILE" | tail -20 || echo "No recent alerts"
        
    } > "$report_file"
    
    echo "Health report generated: $report_file"
    
    # Send report via email if configured
    if command -v mail >/dev/null 2>&1 && [[ -n "$ALERT_EMAIL" ]]; then
        mail -s "ElementMedica Health Report" "$ALERT_EMAIL" < "$report_file"
    fi
}

# Main execution
main() {
    local action="${1:-check-all}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "INFO" "Starting system monitor - Action: $action"
    
    case "$action" in
        "--check-all")
            check_system_resources
            check_elementmedica_services
            check_security
            check_application_metrics
            ;;
        "--check-services")
            check_elementmedica_services
            ;;
        "--check-resources")
            check_system_resources
            ;;
        "--check-security")
            check_security
            ;;
        "--check-metrics")
            check_application_metrics
            ;;
        "--generate-report")
            generate_health_report
            ;;
        "--daemon")
            log "INFO" "Starting monitoring daemon..."
            while true; do
                check_system_resources
                check_elementmedica_services
                check_security
                check_application_metrics
                sleep "$CHECK_INTERVAL"
            done
            ;;
        *)
            echo "Usage: $0 [--check-all|--check-services|--check-resources|--check-security|--check-metrics|--generate-report|--daemon]"
            exit 1
            ;;
    esac
    
    log "INFO" "System monitor completed - Action: $action"
}

# Run main function with all arguments
main "$@"