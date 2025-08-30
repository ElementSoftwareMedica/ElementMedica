# Deployment Guide

**Versione:** 1.0  
**Data:** 27 Gennaio 2025  
**Autore:** Team Development

## 📋 Panoramica

Questa guida fornisce istruzioni dettagliate per il deployment del sistema di gestione documenti in diversi ambienti (development, staging, production).

## 🔧 Prerequisiti

### Requisiti di Sistema

#### Minimi (Development)
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Storage:** 20 GB SSD
- **OS:** Ubuntu 20.04+, macOS 12+, Windows 10+

#### Raccomandati (Production)
- **CPU:** 8 cores
- **RAM:** 16 GB
- **Storage:** 100 GB SSD
- **OS:** Ubuntu 22.04 LTS

### Software Richiesto

```bash
# Node.js (versione 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL (versione 14+)
sudo apt-get install -y postgresql postgresql-contrib

# Redis (versione 6+)
sudo apt-get install -y redis-server

# Docker (opzionale ma raccomandato)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# PM2 (per production)
npm install -g pm2

# Nginx (per production)
sudo apt-get install -y nginx
```

## 🏠 Development Environment

### Setup Locale

```bash
# 1. Clone del repository
git clone https://github.com/your-org/document-management-system.git
cd document-management-system

# 2. Installazione dipendenze
npm install
cd backend && npm install && cd ..

# 3. Setup database locale
sudo -u postgres createdb document_management_dev
sudo -u postgres psql -c "CREATE USER dev_user WITH PASSWORD 'dev_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE document_management_dev TO dev_user;"

# 4. Configurazione environment
cp .env.example .env.development
```

### File di Configurazione Development

```bash
# .env.development
NODE_ENV=development

# Database
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/document_management_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-for-development"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-for-development"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server Ports
MAIN_SERVER_PORT=4001
API_SERVER_PORT=4001
DOCS_SERVER_PORT=4002
PROXY_SERVER_PORT=8888

# Frontend
VITE_API_URL="http://localhost:8888"
VITE_APP_NAME="Document Management System"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="pdf,doc,docx,txt,jpg,png"

# Google APIs (opzionale per development)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Logging
LOG_LEVEL="debug"
LOG_FILE="./logs/app.log"

# GDPR
GDPR_EXPORT_DIR="./exports"
GDPR_RETENTION_DAYS=2555
```

### Avvio Development

```bash
# 1. Migrazione database
npm run db:migrate
npm run db:seed

# 2. Avvio di tutti i servizi
npm run dev

# Oppure avvio singoli servizi
npm run dev:frontend    # Frontend su porta 5173
npm run dev:backend     # Tutti i backend servers
npm run dev:main        # Solo main server
npm run dev:api         # Solo API server
npm run dev:docs        # Solo docs server
npm run dev:proxy       # Solo proxy server

# 3. Avvio Storybook (opzionale)
npm run storybook       # Porta 6006
```

### Verifica Development

```bash
# Test connettività
curl http://localhost:3001/health
curl http://localhost:4001/health
curl http://localhost:4002/health
curl http://localhost:8888/api/health

# Test frontend
open http://localhost:5173

# Test Storybook
open http://localhost:6006
```

## 🧪 Staging Environment

### Setup Server Staging

```bash
# 1. Preparazione server
sudo apt update && sudo apt upgrade -y
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# 2. Creazione utente deploy
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# 3. Installazione software
sudo apt-get install -y nodejs npm postgresql redis-server nginx certbot python3-certbot-nginx

# 4. Configurazione PostgreSQL
sudo -u postgres createdb document_management_staging
sudo -u postgres psql -c "CREATE USER staging_user WITH PASSWORD 'secure_staging_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE document_management_staging TO staging_user;"
```

### Docker Compose Staging

```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx_staging
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - proxy
    restart: unless-stopped
    networks:
      - app_network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      target: production
    container_name: frontend_staging
    environment:
      - NODE_ENV=staging
    volumes:
      - ./dist:/usr/share/nginx/html:ro
    restart: unless-stopped
    networks:
      - app_network

  proxy:
    build:
      context: ./backend
      dockerfile: Dockerfile.proxy
    container_name: proxy_staging
    environment:
      - NODE_ENV=staging
      - PORT=8888
    ports:
      - "8888:8888"
    depends_on:
      - api
      - docs
      - main
    restart: unless-stopped
    networks:
      - app_network

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.api
    container_name: api_staging
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - REDIS_URL=${STAGING_REDIS_URL}
      - JWT_SECRET=${STAGING_JWT_SECRET}
    ports:
      - "4001:4001"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs/api:/app/logs
    restart: unless-stopped
    networks:
      - app_network

  docs:
    build:
      context: ./backend
      dockerfile: Dockerfile.docs
    container_name: docs_staging
    environment:
      - NODE_ENV=staging
      - GOOGLE_CLIENT_ID=${STAGING_GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${STAGING_GOOGLE_CLIENT_SECRET}
    ports:
      - "4002:4002"
    volumes:
      - ./uploads:/app/uploads
      - ./logs/docs:/app/logs
    restart: unless-stopped
    networks:
      - app_network

  main:
    build:
      context: ./backend
      dockerfile: Dockerfile.main
    container_name: main_staging
    environment:
      - NODE_ENV=staging
    ports:
      - "3001:3001"
    volumes:
      - ./logs/main:/app/logs
    restart: unless-stopped
    networks:
      - app_network

  postgres:
    image: postgres:14
    container_name: postgres_staging
    environment:
      - POSTGRES_DB=document_management_staging
      - POSTGRES_USER=${STAGING_DB_USER}
      - POSTGRES_PASSWORD=${STAGING_DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    ports:
      - "5432:5432"
    restart: unless-stopped
    networks:
      - app_network

  redis:
    image: redis:6-alpine
    container_name: redis_staging
    command: redis-server --appendonly yes --requirepass ${STAGING_REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - app_network

  monitoring:
    image: prom/prometheus
    container_name: prometheus_staging
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped
    networks:
      - app_network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:

networks:
  app_network:
    driver: bridge
```

### Configurazione Nginx Staging

```nginx
# nginx/staging.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Upstream servers
    upstream frontend_backend {
        server frontend:80;
    }
    
    upstream proxy_backend {
        server proxy:8888;
    }
    
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name staging.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }
    
    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name staging.yourdomain.com;
        
        # SSL configuration
        ssl_certificate /etc/ssl/certs/staging.yourdomain.com.crt;
        ssl_certificate_key /etc/ssl/certs/staging.yourdomain.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        ssl_prefer_server_ciphers off;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        add_header Referrer-Policy "strict-origin-when-cross-origin";
        
        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://proxy_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Login rate limiting
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://proxy_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Frontend routes
        location / {
            proxy_pass http://frontend_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Handle SPA routing
            try_files $uri $uri/ /index.html;
        }
        
        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            proxy_pass http://frontend_backend;
        }
    }
}
```

### Deploy Staging

```bash
# 1. Preparazione environment
cp .env.example .env.staging

# 2. Build e deploy
./scripts/deploy-staging.sh

# 3. Verifica deployment
curl https://staging.yourdomain.com/api/health
```

### Script Deploy Staging

```bash
#!/bin/bash
# scripts/deploy-staging.sh

set -e

echo "🚀 Starting staging deployment..."

# Variables
STAGING_HOST="staging.yourdomain.com"
STAGING_USER="deploy"
STAGING_PATH="/var/www/staging"
GIT_BRANCH="develop"

# Build frontend
echo "📦 Building frontend..."
npm run build

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.staging.yml build

# Push images to registry (if using remote registry)
echo "📤 Pushing images to registry..."
docker-compose -f docker-compose.staging.yml push

# Deploy to staging server
echo "🚀 Deploying to staging server..."
ssh $STAGING_USER@$STAGING_HOST << EOF
  cd $STAGING_PATH
  git fetch origin
  git checkout $GIT_BRANCH
  git pull origin $GIT_BRANCH
  
  # Pull latest images
  docker-compose -f docker-compose.staging.yml pull
  
  # Stop services
  docker-compose -f docker-compose.staging.yml down
  
  # Start services
  docker-compose -f docker-compose.staging.yml up -d
  
  # Run migrations
  docker-compose -f docker-compose.staging.yml exec -T api npm run db:migrate
  
  # Health check
  sleep 30
  curl -f http://localhost:8888/api/health || exit 1
EOF

echo "✅ Staging deployment completed!"
echo "🌐 Application available at: https://$STAGING_HOST"
```

## 🚀 Production Environment

### Setup Server Production

```bash
# 1. Preparazione server (Ubuntu 22.04 LTS)
sudo apt update && sudo apt upgrade -y

# 2. Configurazione firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow from 10.0.0.0/8 to any port 5432  # PostgreSQL interno
sudo ufw allow from 10.0.0.0/8 to any port 6379  # Redis interno

# 3. Installazione Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. Installazione Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Configurazione sistema
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 6. Configurazione limiti
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf
```

### Docker Compose Production

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/production.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - proxy
    restart: always
    networks:
      - app_network
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      target: production
    container_name: frontend_prod
    environment:
      - NODE_ENV=production
    restart: always
    networks:
      - app_network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  proxy:
    build:
      context: ./backend
      dockerfile: Dockerfile.proxy
    container_name: proxy_prod
    environment:
      - NODE_ENV=production
      - PORT=8888
    ports:
      - "8888:8888"
    depends_on:
      - api
      - docs
      - main
    restart: always
    networks:
      - app_network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.api
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${PROD_DATABASE_URL}
      - REDIS_URL=${PROD_REDIS_URL}
      - JWT_SECRET=${PROD_JWT_SECRET}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs/api:/app/logs
      - ./uploads:/app/uploads
    restart: always
    networks:
      - app_network
    deploy:
      replicas: 4
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  docs:
    build:
      context: ./backend
      dockerfile: Dockerfile.docs
    environment:
      - NODE_ENV=production
      - GOOGLE_CLIENT_ID=${PROD_GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${PROD_GOOGLE_CLIENT_SECRET}
    volumes:
      - ./uploads:/app/uploads
      - ./logs/docs:/app/logs
    restart: always
    networks:
      - app_network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  main:
    build:
      context: ./backend
      dockerfile: Dockerfile.main
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs/main:/app/logs
    restart: always
    networks:
      - app_network
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  postgres:
    image: postgres:14
    container_name: postgres_prod
    environment:
      - POSTGRES_DB=document_management
      - POSTGRES_USER=${PROD_DB_USER}
      - POSTGRES_PASSWORD=${PROD_DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    restart: always
    networks:
      - app_network
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  redis:
    image: redis:6-alpine
    container_name: redis_prod
    command: redis-server --appendonly yes --requirepass ${PROD_REDIS_PASSWORD} --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: always
    networks:
      - app_network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  # Monitoring stack
  prometheus:
    image: prom/prometheus
    container_name: prometheus_prod
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: always
    networks:
      - app_network

  grafana:
    image: grafana/grafana
    container_name: grafana_prod
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: always
    networks:
      - app_network

  # Log aggregation
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: elasticsearch_prod
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    restart: always
    networks:
      - app_network
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    container_name: logstash_prod
    volumes:
      - ./monitoring/logstash/pipeline:/usr/share/logstash/pipeline
      - ./logs:/var/log/app
    depends_on:
      - elasticsearch
    restart: always
    networks:
      - app_network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: kibana_prod
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    restart: always
    networks:
      - app_network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  elasticsearch_data:

networks:
  app_network:
    driver: bridge
```

### Configurazione SSL/TLS

```bash
# 1. Installazione Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Ottenimento certificato SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 3. Auto-renewal setup
sudo crontab -e
# Aggiungere:
0 12 * * * /usr/bin/certbot renew --quiet

# 4. Test auto-renewal
sudo certbot renew --dry-run
```

### Script Deploy Production

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# Variables
PROD_HOST="yourdomain.com"
PROD_USER="deploy"
PROD_PATH="/var/www/production"
GIT_BRANCH="main"
BACKUP_DIR="/var/backups/$(date +%Y%m%d_%H%M%S)"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."
npm run test
npm run lint
npm run type-check

# Build application
echo "📦 Building application..."
npm run build

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.production.yml build

# Push images to registry
echo "📤 Pushing images to registry..."
docker-compose -f docker-compose.production.yml push

# Deploy to production
echo "🚀 Deploying to production..."
ssh $PROD_USER@$PROD_HOST << EOF
  # Create backup
  sudo mkdir -p $BACKUP_DIR
  sudo docker-compose -f $PROD_PATH/docker-compose.production.yml exec -T postgres pg_dump -U \$PROD_DB_USER document_management > $BACKUP_DIR/database.sql
  
  cd $PROD_PATH
  git fetch origin
  git checkout $GIT_BRANCH
  git pull origin $GIT_BRANCH
  
  # Pull latest images
  docker-compose -f docker-compose.production.yml pull
  
  # Rolling update
  docker-compose -f docker-compose.production.yml up -d --no-deps --scale api=2 api
  sleep 30
  docker-compose -f docker-compose.production.yml up -d --no-deps --scale api=4 api
  
  # Update other services
  docker-compose -f docker-compose.production.yml up -d --no-deps frontend proxy docs main
  
  # Run migrations
  docker-compose -f docker-compose.production.yml exec -T api npm run db:migrate
  
  # Health checks
  sleep 60
  curl -f https://yourdomain.com/api/health || exit 1
  
  # Cleanup old images
  docker image prune -f
EOF

echo "✅ Production deployment completed!"
echo "🌐 Application available at: https://$PROD_HOST"

# Post-deployment notifications
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚀 Production deployment completed successfully!"}' \
  $SLACK_WEBHOOK_URL
```

## 📊 Monitoring e Logging

### Configurazione Prometheus

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'api-server'
    static_configs:
      - targets: ['api:4001']
    metrics_path: '/metrics'

  - job_name: 'docs-server'
    static_configs:
      - targets: ['docs:4002']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

set -e

echo "🏥 Running health checks..."

# Check services
services=("nginx" "api" "docs" "main" "proxy" "postgres" "redis")

for service in "${services[@]}"; do
  if docker-compose ps $service | grep -q "Up"; then
    echo "✅ $service is running"
  else
    echo "❌ $service is not running"
    exit 1
  fi
done

# Check endpoints
endpoints=(
  "https://yourdomain.com/api/health"
  "https://yourdomain.com/api/info"
)

for endpoint in "${endpoints[@]}"; do
  if curl -f -s $endpoint > /dev/null; then
    echo "✅ $endpoint is responding"
  else
    echo "❌ $endpoint is not responding"
    exit 1
  fi
done

# Check database connectivity
if docker-compose exec -T postgres pg_isready -U $PROD_DB_USER > /dev/null; then
  echo "✅ Database is accessible"
else
  echo "❌ Database is not accessible"
  exit 1
fi

# Check Redis connectivity
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
  echo "✅ Redis is accessible"
else
  echo "❌ Redis is not accessible"
  exit 1
fi

echo "🎉 All health checks passed!"
```

## 🔄 Backup e Recovery

### Script Backup Automatico

```bash
#!/bin/bash
# scripts/backup.sh

set -e

BACKUP_DIR="/var/backups/$(date +%Y%m%d_%H%M%S)"
S3_BUCKET="your-backup-bucket"
RETENTION_DAYS=30

echo "💾 Starting backup process..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "📊 Backing up database..."
docker-compose exec -T postgres pg_dump -U $PROD_DB_USER document_management | gzip > $BACKUP_DIR/database.sql.gz

# Redis backup
echo "💾 Backing up Redis..."
docker-compose exec -T redis redis-cli --rdb /data/dump.rdb
docker cp redis_prod:/data/dump.rdb $BACKUP_DIR/redis.rdb

# Files backup
echo "📁 Backing up files..."
tar -czf $BACKUP_DIR/uploads.tar.gz ./uploads
tar -czf $BACKUP_DIR/logs.tar.gz ./logs

# Configuration backup
echo "⚙️ Backing up configuration..."
cp .env.production $BACKUP_DIR/
cp docker-compose.production.yml $BACKUP_DIR/
cp -r nginx/ $BACKUP_DIR/
cp -r monitoring/ $BACKUP_DIR/

# Upload to S3
echo "☁️ Uploading to S3..."
aws s3 sync $BACKUP_DIR s3://$S3_BUCKET/backups/$(basename $BACKUP_DIR)/

# Cleanup old backups
echo "🧹 Cleaning up old backups..."
find /var/backups -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
aws s3 ls s3://$S3_BUCKET/backups/ | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    dirName=$(echo $line | awk '{print $4}')
    aws s3 rm s3://$S3_BUCKET/backups/$dirName --recursive
  fi
done

echo "✅ Backup completed successfully!"
```

### Script Recovery

```bash
#!/bin/bash
# scripts/restore.sh

set -e

BACKUP_DATE=$1
BACKUP_DIR="/var/backups/$BACKUP_DATE"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  echo "Example: $0 20250127_120000"
  exit 1
fi

echo "🔄 Starting restore process for backup: $BACKUP_DATE"

# Download from S3 if not local
if [ ! -d "$BACKUP_DIR" ]; then
  echo "📥 Downloading backup from S3..."
  aws s3 sync s3://$S3_BUCKET/backups/$BACKUP_DATE/ $BACKUP_DIR/
fi

# Stop services
echo "⏹️ Stopping services..."
docker-compose -f docker-compose.production.yml down

# Restore database
echo "📊 Restoring database..."
docker-compose -f docker-compose.production.yml up -d postgres
sleep 30
gunzip -c $BACKUP_DIR/database.sql.gz | docker-compose exec -T postgres psql -U $PROD_DB_USER document_management

# Restore Redis
echo "💾 Restoring Redis..."
docker cp $BACKUP_DIR/redis.rdb redis_prod:/data/dump.rdb
docker-compose restart redis

# Restore files
echo "📁 Restoring files..."
tar -xzf $BACKUP_DIR/uploads.tar.gz
tar -xzf $BACKUP_DIR/logs.tar.gz

# Start all services
echo "▶️ Starting all services..."
docker-compose -f docker-compose.production.yml up -d

# Health check
echo "🏥 Running health check..."
sleep 60
./scripts/health-check.sh

echo "✅ Restore completed successfully!"
```

---

**Precedente:** [Database Schema](../technical/database/schema.md)  
**Prossimo:** [User Manual](../user/user-manual.md)  
**Correlato:** [System Overview](../technical/architecture/system-overview.md)