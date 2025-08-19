#!/bin/bash

# ElementMedica 2.0 - Startup Setup Script
# Configurazione automatica per deployment economico (€4.78/mese)
# Target: Hetzner CX11 + Supabase Free + Cloudflare

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="elementmedica"
APP_DIR="/home/$APP_NAME/app"
NODE_VERSION="18"
PM2_VERSION="latest"

echo -e "${BLUE}🚀 ElementMedica 2.0 - Startup Setup${NC}"
echo -e "${BLUE}💰 Budget Target: €4.78/mese${NC}"
echo -e "${BLUE}🖥️  Server: Hetzner CX11 (2GB RAM)${NC}"
echo "================================================"

# Function to print step
print_step() {
    echo -e "\n${YELLOW}📋 Step $1: $2${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if service is running
service_running() {
    systemctl is-active --quiet "$1"
}

# 1. System Update
print_step "1" "Updating system packages"
sudo apt update && sudo apt upgrade -y

# 2. Install essential packages
print_step "2" "Installing essential packages"
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    htop \
    nano \
    ufw \
    fail2ban \
    logrotate

# 3. Create application user
print_step "3" "Creating application user"
if ! id "$APP_NAME" &>/dev/null; then
    sudo useradd -m -s /bin/bash "$APP_NAME"
    sudo usermod -aG sudo "$APP_NAME"
    echo -e "${GREEN}✅ User $APP_NAME created${NC}"
else
    echo -e "${YELLOW}⚠️  User $APP_NAME already exists${NC}"
fi

# 4. Install Node.js
print_step "4" "Installing Node.js $NODE_VERSION"
if ! command_exists node; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js $(node --version) already installed${NC}"
fi

# 5. Install PM2
print_step "5" "Installing PM2"
if ! command_exists pm2; then
    sudo npm install -g pm2@$PM2_VERSION
    pm2 install pm2-logrotate
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 already installed${NC}"
fi

# 6. Install Docker
print_step "6" "Installing Docker"
if ! command_exists docker; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker "$APP_NAME"
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${YELLOW}⚠️  Docker already installed${NC}"
fi

# 7. Install Docker Compose
print_step "7" "Installing Docker Compose"
if ! command_exists docker-compose; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${YELLOW}⚠️  Docker Compose already installed${NC}"
fi

# 8. Configure Nginx
print_step "8" "Installing and configuring Nginx"
if ! command_exists nginx; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    echo -e "${GREEN}✅ Nginx installed${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx already installed${NC}"
fi

# 9. Configure UFW Firewall
print_step "9" "Configuring UFW firewall"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo -e "${GREEN}✅ UFW firewall configured${NC}"

# 10. Configure Fail2Ban
print_step "10" "Configuring Fail2Ban"
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create custom jail for Nginx
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl restart fail2ban
echo -e "${GREEN}✅ Fail2Ban configured${NC}"

# 11. Create application directories
print_step "11" "Creating application directories"
sudo mkdir -p "$APP_DIR"
sudo mkdir -p "/home/$APP_NAME/logs"
sudo mkdir -p "/home/$APP_NAME/backups"
sudo mkdir -p "/home/$APP_NAME/uploads"
sudo mkdir -p "/home/$APP_NAME/temp"
sudo chown -R "$APP_NAME:$APP_NAME" "/home/$APP_NAME"
echo -e "${GREEN}✅ Application directories created${NC}"

# 12. Configure log rotation
print_step "12" "Configuring log rotation"
sudo tee /etc/logrotate.d/elementmedica > /dev/null <<EOF
/home/$APP_NAME/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
    su $APP_NAME $APP_NAME
}
EOF
echo -e "${GREEN}✅ Log rotation configured${NC}"

# 13. Install Certbot for SSL
print_step "13" "Installing Certbot for SSL certificates"
if ! command_exists certbot; then
    sudo apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${YELLOW}⚠️  Certbot already installed${NC}"
fi

# 14. Configure system limits
print_step "14" "Configuring system limits"
sudo tee -a /etc/security/limits.conf > /dev/null <<EOF
# ElementMedica limits
$APP_NAME soft nofile 65536
$APP_NAME hard nofile 65536
$APP_NAME soft nproc 4096
$APP_NAME hard nproc 4096
EOF

# Configure systemd limits
sudo mkdir -p /etc/systemd/system.conf.d
sudo tee /etc/systemd/system.conf.d/limits.conf > /dev/null <<EOF
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=4096
EOF

echo -e "${GREEN}✅ System limits configured${NC}"

# 15. Configure swap (importante per server con 2GB RAM)
print_step "15" "Configuring swap file"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    
    # Optimize swap usage
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
    
    echo -e "${GREEN}✅ Swap file configured (2GB)${NC}"
else
    echo -e "${YELLOW}⚠️  Swap file already exists${NC}"
fi

# 16. Create environment template
print_step "16" "Creating environment template"
sudo -u "$APP_NAME" tee "/home/$APP_NAME/.env.template" > /dev/null <<EOF
# ElementMedica 2.0 - Environment Configuration
# Startup Deployment (€4.78/mese)

# Database (Supabase)
DATABASE_URL="postgresql://username:password@db.supabase.co:5432/postgres"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="24h"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Application
NODE_ENV="production"
FRONTEND_URL="https://elementmedica.com"
CORS_ORIGIN="https://elementmedica.com"

# Redis
REDIS_URL="redis://localhost:6379"

# Email (Brevo Free)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER="your-brevo-email"
SMTP_PASS="your-brevo-password"
FROM_EMAIL="noreply@elementmedica.com"

# Storage (Cloudflare R2)
CLOUDFLARE_R2_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
CLOUDFLARE_R2_ACCESS_KEY="your-access-key"
CLOUDFLARE_R2_SECRET_KEY="your-secret-key"
CLOUDFLARE_R2_BUCKET="elementmedica-storage"

# Monitoring
UPTIME_ROBOT_API_KEY="your-uptimerobot-api-key"
GRAFANA_CLOUD_API_KEY="your-grafana-cloud-api-key"

# Security
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
SESSION_SECRET="your-session-secret-change-this"

# Logging
LOG_LEVEL="info"
LOG_FILE="./logs/app.log"
EOF

echo -e "${GREEN}✅ Environment template created${NC}"

# 17. Create startup script
print_step "17" "Creating startup script"
sudo -u "$APP_NAME" tee "/home/$APP_NAME/start-elementmedica.sh" > /dev/null <<'EOF'
#!/bin/bash

# ElementMedica 2.0 - Startup Script

set -e

APP_DIR="/home/elementmedica/app"
LOG_DIR="/home/elementmedica/logs"

echo "🚀 Starting ElementMedica 2.0..."

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory not found: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Environment file not found. Please copy .env.template to .env and configure it."
    exit 1
fi

# Create logs directory
mkdir -p "$LOG_DIR"

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.startup.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Start PM2 services
echo "🔧 Starting PM2 services..."
pm2 start ecosystem.startup.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup

echo "✅ ElementMedica 2.0 started successfully!"
echo "📊 Check status with: pm2 status"
echo "📋 Check logs with: pm2 logs"
echo "🌐 Health check: curl http://localhost:4003/health"
EOF

sudo chmod +x "/home/$APP_NAME/start-elementmedica.sh"
echo -e "${GREEN}✅ Startup script created${NC}"

# 18. Create systemd service
print_step "18" "Creating systemd service"
sudo tee /etc/systemd/system/elementmedica.service > /dev/null <<EOF
[Unit]
Description=ElementMedica 2.0 Application
After=network.target docker.service
Requires=docker.service

[Service]
Type=forking
User=$APP_NAME
WorkingDirectory=/home/$APP_NAME/app
ExecStart=/home/$APP_NAME/start-elementmedica.sh
ExecReload=/bin/kill -USR2 \$MAINPID
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Restart=always
RestartSec=10

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
MemoryLimit=1.5G

# Environment
Environment=NODE_ENV=production
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable elementmedica
echo -e "${GREEN}✅ Systemd service created${NC}"

# 19. Configure monitoring
print_step "19" "Setting up basic monitoring"

# Create monitoring script
sudo -u "$APP_NAME" tee "/home/$APP_NAME/monitor.sh" > /dev/null <<'EOF'
#!/bin/bash

# ElementMedica 2.0 - Basic Monitoring Script

LOG_FILE="/home/elementmedica/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting health check..." >> "$LOG_FILE"

# Check PM2 processes
PM2_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="elementmedica-api" or .name=="elementmedica-proxy") | .pm2_env.status' | grep -v "online" | wc -l)

if [ "$PM2_STATUS" -gt 0 ]; then
    echo "[$DATE] WARNING: Some PM2 processes are not online" >> "$LOG_FILE"
    pm2 status >> "$LOG_FILE"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "[$DATE] WARNING: Memory usage is ${MEM_USAGE}%" >> "$LOG_FILE"
fi

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4003/health)
if [ "$API_HEALTH" != "200" ]; then
    echo "[$DATE] ERROR: API health check failed (HTTP $API_HEALTH)" >> "$LOG_FILE"
fi

echo "[$DATE] Health check completed" >> "$LOG_FILE"
EOF

sudo chmod +x "/home/$APP_NAME/monitor.sh"

# Add to crontab
(sudo -u "$APP_NAME" crontab -l 2>/dev/null; echo "*/5 * * * * /home/$APP_NAME/monitor.sh") | sudo -u "$APP_NAME" crontab -

echo -e "${GREEN}✅ Basic monitoring configured${NC}"

# 20. Final system optimization
print_step "20" "Final system optimization"

# Optimize kernel parameters
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# ElementMedica optimizations
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 1024
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_rmem = 4096 87380 6291456
net.ipv4.tcp_wmem = 4096 16384 4194304
fs.file-max = 65536
EOF

sudo sysctl -p

echo -e "${GREEN}✅ System optimization completed${NC}"

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}🎉 ElementMedica 2.0 Setup Completed!${NC}"
echo "================================================"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure your domain DNS to point to this server"
echo "2. Copy .env.template to .env and configure it"
echo "3. Clone your repository to $APP_DIR"
echo "4. Run SSL certificate setup: sudo certbot --nginx -d yourdomain.com"
echo "5. Start the application: sudo systemctl start elementmedica"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo "• Check status: sudo systemctl status elementmedica"
echo "• View logs: sudo journalctl -u elementmedica -f"
echo "• PM2 status: sudo -u $APP_NAME pm2 status"
echo "• Health check: curl http://localhost:4003/health"
echo ""
echo -e "${BLUE}💰 Estimated Monthly Cost: €4.78${NC}"
echo "• Hetzner CX11: €3.29"
echo "• Domain: €1.00"
echo "• Supabase: €0.00 (Free tier)"
echo "• Cloudflare: €0.00 (Free tier)"
echo "• Other services: €0.00 (Free tiers)"
echo ""
echo -e "${GREEN}✅ Server is ready for ElementMedica 2.0 deployment!${NC}"