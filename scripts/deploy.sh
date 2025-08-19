#!/bin/bash

# ElementMedica 2.0 - Automated Deployment Script
# Version: 2.0
# Author: ElementSoftware Medica
# Description: Automated deployment script for production environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ElementMedica"
APP_VERSION="2.0"
DEPLOY_DIR="/opt/elementmedica"
APP_DIR="${DEPLOY_DIR}/app"
REPO_URL="https://github.com/ElementSoftwareMedica/ElementMedica.git"
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
BACKUP_DIR="${DEPLOY_DIR}/backups"
LOG_FILE="${DEPLOY_DIR}/logs/deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root. Use: sudo $0"
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check OS
    if ! grep -q "Ubuntu" /etc/os-release; then
        warn "This script is optimized for Ubuntu. Proceed with caution."
    fi
    
    # Check memory
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -lt 4 ]]; then
        warn "System has only ${MEMORY_GB}GB RAM. Minimum 8GB recommended."
    fi
    
    # Check disk space
    DISK_SPACE=$(df / | awk 'NR==2{print $4}')
    if [[ $DISK_SPACE -lt 20971520 ]]; then # 20GB in KB
        warn "Low disk space. At least 50GB recommended."
    fi
    
    log "System requirements check completed"
}

# Install dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install required packages
    apt install -y \
        curl \
        wget \
        git \
        unzip \
        htop \
        nano \
        ufw \
        fail2ban \
        logrotate \
        cron \
        certbot
    
    # Install Docker
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        
        # Add current user to docker group
        usermod -aG docker $USER
    else
        log "Docker already installed"
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
        curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    else
        log "Docker Compose already installed"
    fi
    
    log "Dependencies installation completed"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow monitoring (restrict to specific IPs in production)
    ufw allow 9090/tcp comment "Prometheus"
    ufw allow 3000/tcp comment "Grafana"
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configuration completed"
}

# Setup directory structure
setup_directories() {
    log "Setting up directory structure..."
    
    # Create main directories
    mkdir -p "$DEPLOY_DIR"/{data,logs,backups,ssl,scripts}
    mkdir -p "$DEPLOY_DIR"/data/{postgres,redis,uploads,prometheus,grafana}
    mkdir -p "$DEPLOY_DIR"/logs/{nginx,app,deploy}
    
    # Set permissions
    chown -R 1000:1000 "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
    
    # Create log file
    touch "$LOG_FILE"
    chown 1000:1000 "$LOG_FILE"
    
    log "Directory structure setup completed"
}

# Clone or update repository
setup_repository() {
    log "Setting up application repository..."
    
    if [[ -d "$APP_DIR" ]]; then
        log "Repository exists, updating..."
        cd "$APP_DIR"
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    else
        log "Cloning repository..."
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
    
    # Set ownership
    chown -R 1000:1000 "$APP_DIR"
    
    log "Repository setup completed"
}

# Configure environment
configure_environment() {
    log "Configuring environment variables..."
    
    cd "$APP_DIR"
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.production" ]]; then
            cp .env.production .env
            log "Copied .env.production to .env"
        else
            error ".env.production file not found"
        fi
    fi
    
    # Generate random secrets if not set
    if grep -q "CHANGE_THIS" .env; then
        warn "Found placeholder values in .env file"
        
        # Generate JWT secrets
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        SESSION_SECRET=$(openssl rand -base64 32 | tr -d "\n")
        CSRF_SECRET=$(openssl rand -base64 32 | tr -d "\n")
        
        # Replace placeholders
        sed -i "s/CHANGE_THIS_JWT_SECRET_VERY_LONG_AND_RANDOM_STRING_789!/${JWT_SECRET}/g" .env
        sed -i "s/CHANGE_THIS_REFRESH_SECRET_ANOTHER_LONG_RANDOM_STRING_012!/${JWT_REFRESH_SECRET}/g" .env
        sed -i "s/CHANGE_THIS_SESSION_SECRET_LONG_RANDOM_STRING_345!/${SESSION_SECRET}/g" .env
        sed -i "s/CHANGE_THIS_CSRF_SECRET_RANDOM_STRING_678!/${CSRF_SECRET}/g" .env
        
        log "Generated random secrets"
    fi
    
    log "Environment configuration completed"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    read -p "Enter your domain name (e.g., example.com): " DOMAIN
    
    if [[ -z "$DOMAIN" ]]; then
        warn "No domain provided, skipping SSL setup"
        return
    fi
    
    # Stop any running web servers
    systemctl stop nginx 2>/dev/null || true
    docker stop nginx 2>/dev/null || true
    
    # Obtain SSL certificate
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" \
        -d "$DOMAIN" \
        -d "www.${DOMAIN}"
    
    # Copy certificates
    cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${DEPLOY_DIR}/ssl/"
    cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${DEPLOY_DIR}/ssl/"
    chown 1000:1000 "${DEPLOY_DIR}/ssl/"*
    
    # Update domain in .env
    cd "$APP_DIR"
    sed -i "s/your-domain.com/${DOMAIN}/g" .env
    sed -i "s/your-domain.com/${DOMAIN}/g" nginx/nginx.prod.conf
    
    # Setup auto-renewal
    echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f ${APP_DIR}/${DOCKER_COMPOSE_FILE} restart nginx" | crontab -
    
    log "SSL certificates setup completed for $DOMAIN"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    cd "$APP_DIR"
    
    # Pull latest images
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build and start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npx prisma migrate deploy || warn "Migration failed, database might not be ready"
    
    # Generate Prisma client
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend npx prisma generate || warn "Prisma generate failed"
    
    log "Application deployment completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    cd "$APP_DIR"
    
    # Check container status
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        error "Some containers are not running"
    fi
    
    # Test health endpoints
    sleep 10
    
    if curl -f http://localhost/health >/dev/null 2>&1; then
        log "✅ Nginx health check passed"
    else
        warn "❌ Nginx health check failed"
    fi
    
    if curl -f http://localhost:4003/healthz >/dev/null 2>&1; then
        log "✅ Backend health check passed"
    else
        warn "❌ Backend health check failed"
    fi
    
    # Test database connection
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready >/dev/null 2>&1; then
        log "✅ Database connection check passed"
    else
        warn "❌ Database connection check failed"
    fi
    
    # Test Redis connection
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        log "✅ Redis connection check passed"
    else
        warn "❌ Redis connection check failed"
    fi
    
    log "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and logging..."
    
    # Setup logrotate
    cat > /etc/logrotate.d/elementmedica << EOF
${DEPLOY_DIR}/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 1000 1000
    postrotate
        docker kill -s USR1 \$(docker ps -q --filter name=elementmedica-nginx) 2>/dev/null || true
    endscript
}
EOF
    
    # Setup backup cron
    echo "0 2 * * * cd ${APP_DIR} && docker-compose -f ${DOCKER_COMPOSE_FILE} exec -T backup /backup.sh" | crontab -
    
    # Setup system monitoring
    cat > "${DEPLOY_DIR}/scripts/system-monitor.sh" << 'EOF'
#!/bin/bash
# System monitoring script
LOG_FILE="/opt/elementmedica/logs/system-monitor.log"
echo "[$(date)] System Status:" >> "$LOG_FILE"
echo "Memory: $(free -h | grep Mem | awk '{print $3"/"$2}')" >> "$LOG_FILE"
echo "Disk: $(df -h / | awk 'NR==2{print $3"/"$2" ("$5" used)"}')" >> "$LOG_FILE"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')" >> "$LOG_FILE"
echo "Docker containers: $(docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -c Up)" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
EOF
    
    chmod +x "${DEPLOY_DIR}/scripts/system-monitor.sh"
    echo "*/15 * * * * ${DEPLOY_DIR}/scripts/system-monitor.sh" | crontab -
    
    log "Monitoring and logging setup completed"
}

# Main deployment function
main() {
    log "Starting ElementMedica 2.0 deployment..."
    log "Deployment directory: $DEPLOY_DIR"
    log "Repository URL: $REPO_URL"
    
    check_root
    check_requirements
    install_dependencies
    configure_firewall
    setup_directories
    setup_repository
    configure_environment
    
    # Ask for SSL setup
    read -p "Do you want to setup SSL certificates? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    deploy_application
    verify_deployment
    setup_monitoring
    
    log "🎉 ElementMedica 2.0 deployment completed successfully!"
    log "📊 Access your application at: http://$(curl -s ifconfig.me)"
    log "📈 Monitoring dashboard: http://$(curl -s ifconfig.me):3000"
    log "📋 Logs location: $LOG_FILE"
    
    info "Next steps:"
    info "1. Configure your domain DNS to point to this server"
    info "2. Update .env file with your specific settings"
    info "3. Setup monitoring alerts"
    info "4. Configure backup retention policies"
    info "5. Review security settings"
    
    log "Deployment script completed at $(date)"
}

# Script options
case "${1:-}" in
    "--help" | "-h")
        echo "ElementMedica 2.0 Deployment Script"
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --verify       Verify existing deployment"
        echo "  --update       Update existing deployment"
        echo "  --backup       Create backup before deployment"
        exit 0
        ;;
    "--verify")
        verify_deployment
        exit 0
        ;;
    "--update")
        log "Updating existing deployment..."
        setup_repository
        deploy_application
        verify_deployment
        exit 0
        ;;
    "--backup")
        if [[ -d "$APP_DIR" ]]; then
            BACKUP_NAME="elementmedica_backup_$(date +%Y%m%d_%H%M%S)"
            tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "$DEPLOY_DIR" app data
            log "Backup created: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
        else
            error "No existing deployment found to backup"
        fi
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1. Use --help for usage information."
        ;;
esac