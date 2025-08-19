#!/bin/bash

# ElementMedica 2.0 - Startup Deployment Script
# Deploy automatico per configurazione economica (€4.78/mese)
# Target: Hetzner CX11 + Supabase + Cloudflare

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="elementmedica"
APP_DIR="/home/$APP_NAME/app"
BACKUP_DIR="/home/$APP_NAME/backups"
LOG_DIR="/home/$APP_NAME/logs"
REPO_URL="https://github.com/elementmedica/elementmedica-2.0.git"
BRANCH="main"
MAX_BACKUPS=5

# Functions
print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE}🚀 ElementMedica 2.0 - Startup Deployment${NC}"
    echo -e "${BLUE}💰 Budget: €4.78/mese | Server: Hetzner CX11${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_step() {
    echo -e "\n${YELLOW}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as correct user
check_user() {
    if [ "$(whoami)" != "$APP_NAME" ]; then
        print_error "This script must be run as user '$APP_NAME'"
        echo "Run: sudo -u $APP_NAME $0"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_step "1" "Checking prerequisites"
    
    # Check if required commands exist
    local commands=("git" "node" "npm" "pm2" "docker" "docker-compose")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            print_error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Check if .env file exists
    if [ ! -f "$APP_DIR/.env" ]; then
        print_error "Environment file not found: $APP_DIR/.env"
        print_info "Please copy .env.template to .env and configure it"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Create backup
create_backup() {
    print_step "2" "Creating backup"
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/backup_$timestamp.tar.gz"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create backup (exclude node_modules and logs)
    if [ -d "$APP_DIR" ]; then
        tar -czf "$backup_file" \
            --exclude="node_modules" \
            --exclude="logs" \
            --exclude=".git" \
            --exclude="temp" \
            --exclude="uploads" \
            -C "$(dirname "$APP_DIR")" \
            "$(basename "$APP_DIR")"
        
        print_success "Backup created: $backup_file"
    else
        print_warning "App directory not found, skipping backup"
    fi
    
    # Clean old backups (keep only last 5)
    local backup_count=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local files_to_delete=$((backup_count - MAX_BACKUPS))
        ls -1t "$BACKUP_DIR"/backup_*.tar.gz | tail -n "$files_to_delete" | xargs rm -f
        print_info "Cleaned $files_to_delete old backup(s)"
    fi
}

# Stop services
stop_services() {
    print_step "3" "Stopping services"
    
    # Stop PM2 processes
    if pm2 list | grep -q "elementmedica"; then
        pm2 stop all
        print_success "PM2 processes stopped"
    else
        print_warning "No PM2 processes running"
    fi
    
    # Stop Docker services
    if [ -f "$APP_DIR/docker-compose.startup.yml" ]; then
        cd "$APP_DIR"
        docker-compose -f docker-compose.startup.yml down
        print_success "Docker services stopped"
    else
        print_warning "Docker compose file not found"
    fi
}

# Update code
update_code() {
    print_step "4" "Updating code"
    
    if [ ! -d "$APP_DIR" ]; then
        # First deployment - clone repository
        print_info "First deployment - cloning repository"
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
        git checkout "$BRANCH"
    else
        # Update existing repository
        cd "$APP_DIR"
        
        # Stash any local changes
        if ! git diff-index --quiet HEAD --; then
            git stash push -m "Auto-stash before deployment $(date)"
            print_info "Local changes stashed"
        fi
        
        # Fetch and pull latest changes
        git fetch origin
        git checkout "$BRANCH"
        git pull origin "$BRANCH"
    fi
    
    # Show current commit
    local current_commit=$(git rev-parse --short HEAD)
    local commit_message=$(git log -1 --pretty=format:"%s")
    print_success "Updated to commit $current_commit: $commit_message"
}

# Install dependencies
install_dependencies() {
    print_step "5" "Installing dependencies"
    
    cd "$APP_DIR"
    
    # Clear npm cache if needed
    npm cache clean --force
    
    # Install backend dependencies
    if [ -f "package.json" ]; then
        npm ci --production
        print_success "Backend dependencies installed"
    fi
    
    # Install frontend dependencies
    if [ -f "package.json" ]; then
        npm ci
        print_success "Frontend dependencies installed"
    fi
}

# Run database migrations
run_migrations() {
    print_step "6" "Running database migrations"
    
    cd "$APP_DIR"
    
    # Check if Prisma is available
    if [ -f "backend/prisma/schema.prisma" ]; then
        # Generate Prisma client
        npx prisma generate --schema=backend/prisma/schema.prisma
        
        # Run migrations
        npx prisma migrate deploy --schema=backend/prisma/schema.prisma
        
        print_success "Database migrations completed"
    else
        print_warning "Prisma schema not found, skipping migrations"
    fi
}

# Build application
build_application() {
    print_step "7" "Building application"
    
    cd "$APP_DIR"
    
    # Build frontend
    if [ -f "package.json" ] && npm run build --if-present; then
        print_success "Frontend build completed"
    else
        print_warning "Frontend build script not found or failed"
    fi
    
    # Optimize for production
    if [ -d "node_modules" ]; then
        # Remove development dependencies
        npm prune --production
        print_success "Development dependencies removed"
    fi
}

# Start services
start_services() {
    print_step "8" "Starting services"
    
    cd "$APP_DIR"
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$APP_DIR/temp"
    mkdir -p "$APP_DIR/uploads"
    
    # Start Docker services
    if [ -f "docker-compose.startup.yml" ]; then
        docker-compose -f docker-compose.startup.yml up -d
        print_success "Docker services started"
        
        # Wait for services to be ready
        print_info "Waiting for services to be ready..."
        sleep 15
    fi
    
    # Start PM2 services
    if [ -f "ecosystem.startup.config.js" ]; then
        pm2 start ecosystem.startup.config.js --env production
        pm2 save
        print_success "PM2 services started"
    else
        print_error "PM2 configuration file not found"
        exit 1
    fi
}

# Health checks
run_health_checks() {
    print_step "9" "Running health checks"
    
    local max_attempts=30
    local attempt=1
    
    # Check API health
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:4001/api/health >/dev/null 2>&1; then
            print_success "API server is healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "API server health check failed after $max_attempts attempts"
            return 1
        fi
        
        print_info "Attempt $attempt/$max_attempts: Waiting for API server..."
        sleep 2
        ((attempt++))
    done
    
    # Check Proxy health
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:4003/health >/dev/null 2>&1; then
            print_success "Proxy server is healthy"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Proxy server health check failed after $max_attempts attempts"
            return 1
        fi
        
        print_info "Attempt $attempt/$max_attempts: Waiting for proxy server..."
        sleep 2
        ((attempt++))
    done
    
    # Check Docker services
    if docker-compose -f "$APP_DIR/docker-compose.startup.yml" ps | grep -q "Up"; then
        print_success "Docker services are running"
    else
        print_warning "Some Docker services may not be running"
    fi
    
    # Check PM2 processes
    local pm2_status=$(pm2 jlist | jq -r '.[] | select(.name | test("elementmedica")) | .pm2_env.status' | grep -v "online" | wc -l)
    if [ "$pm2_status" -eq 0 ]; then
        print_success "All PM2 processes are online"
    else
        print_warning "Some PM2 processes are not online"
        pm2 status
    fi
}

# Post-deployment tasks
post_deployment() {
    print_step "10" "Post-deployment tasks"
    
    # Update Nginx configuration if needed
    if [ -f "$APP_DIR/config/nginx/startup.conf" ]; then
        sudo cp "$APP_DIR/config/nginx/startup.conf" /etc/nginx/sites-available/elementmedica
        sudo ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
        
        # Test Nginx configuration
        if sudo nginx -t; then
            sudo systemctl reload nginx
            print_success "Nginx configuration updated"
        else
            print_error "Nginx configuration test failed"
        fi
    fi
    
    # Clear application caches
    if [ -d "$APP_DIR/temp" ]; then
        find "$APP_DIR/temp" -type f -mtime +1 -delete
        print_info "Temporary files cleaned"
    fi
    
    # Log deployment
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local commit=$(cd "$APP_DIR" && git rev-parse --short HEAD)
    echo "[$timestamp] Deployment completed - Commit: $commit" >> "$LOG_DIR/deployment.log"
    
    print_success "Post-deployment tasks completed"
}

# Rollback function
rollback() {
    print_error "Deployment failed! Starting rollback..."
    
    # Stop current services
    pm2 stop all || true
    docker-compose -f "$APP_DIR/docker-compose.startup.yml" down || true
    
    # Restore from latest backup
    local latest_backup=$(ls -1t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -n 1)
    if [ -n "$latest_backup" ]; then
        print_info "Restoring from backup: $latest_backup"
        
        # Remove current app directory
        rm -rf "$APP_DIR"
        
        # Extract backup
        tar -xzf "$latest_backup" -C "$(dirname "$APP_DIR")"
        
        # Restart services
        cd "$APP_DIR"
        docker-compose -f docker-compose.startup.yml up -d
        sleep 10
        pm2 start ecosystem.startup.config.js --env production
        
        print_success "Rollback completed"
    else
        print_error "No backup found for rollback"
    fi
}

# Cleanup function
cleanup() {
    print_step "11" "Cleanup"
    
    # Clean Docker images
    docker image prune -f
    
    # Clean npm cache
    npm cache clean --force
    
    # Clean logs older than 7 days
    find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Display deployment summary
show_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local commit=$(cd "$APP_DIR" && git rev-parse --short HEAD)
    local commit_message=$(cd "$APP_DIR" && git log -1 --pretty=format:"%s")
    
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${GREEN}🎉 Deployment Completed Successfully!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo -e "  • Duration: ${duration}s"
    echo -e "  • Commit: $commit"
    echo -e "  • Message: $commit_message"
    echo -e "  • Environment: Production (Startup)"
    echo -e "  • Server: Hetzner CX11 (2GB RAM)"
    echo -e "  • Budget: €4.78/mese"
    echo ""
    echo -e "${BLUE}🔗 Service URLs:${NC}"
    echo -e "  • API Health: http://localhost:4001/api/health"
    echo -e "  • Proxy Health: http://localhost:4003/health"
    echo -e "  • Application: https://$(hostname -f)"
    echo ""
    echo -e "${BLUE}📋 Useful Commands:${NC}"
    echo -e "  • Check status: pm2 status"
    echo -e "  • View logs: pm2 logs"
    echo -e "  • Monitor: pm2 monit"
    echo -e "  • Docker status: docker-compose -f docker-compose.startup.yml ps"
    echo ""
    echo -e "${BLUE}📈 Monitoring:${NC}"
    echo -e "  • UptimeRobot: Monitor configured"
    echo -e "  • Logs: $LOG_DIR"
    echo -e "  • Health checks: Every 5 minutes"
    echo -e "${BLUE}================================================${NC}"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    # Trap errors for rollback
    trap 'rollback; exit 1' ERR
    
    print_header
    
    # Parse command line arguments
    local skip_backup=false
    local skip_health_checks=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --skip-health-checks)
                skip_health_checks=true
                shift
                ;;
            --branch)
                BRANCH="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-backup          Skip backup creation"
                echo "  --skip-health-checks   Skip health checks"
                echo "  --branch BRANCH         Deploy specific branch (default: main)"
                echo "  --help                  Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_user
    check_prerequisites
    
    if [ "$skip_backup" = false ]; then
        create_backup
    fi
    
    stop_services
    update_code
    install_dependencies
    run_migrations
    build_application
    start_services
    
    if [ "$skip_health_checks" = false ]; then
        run_health_checks
    fi
    
    post_deployment
    cleanup
    
    # Remove error trap
    trap - ERR
    
    show_summary
}

# Run main function with all arguments
main "$@"