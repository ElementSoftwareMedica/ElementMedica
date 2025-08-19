# Deployment Architecture

**Versione:** 1.0  
**Data:** 27 Gennaio 2025  
**Autore:** Team Development

## 📋 Panoramica

L'architettura di deployment è progettata per supportare ambienti multipli (development, staging, production) con scalabilità orizzontale, alta disponibilità e facilità di manutenzione.

## 🏗️ Architettura Generale

```mermaid
graph TB
    subgraph "🌐 Internet"
        U["👥 Users"]
        CDN["📡 CDN"]
    end
    
    subgraph "🔒 Load Balancer Layer"
        LB["⚖️ Load Balancer<br/>(Nginx/HAProxy)"]
        SSL["🔐 SSL Termination"]
    end
    
    subgraph "🖥️ Application Layer"
        subgraph "Frontend Cluster"
            F1["🌐 Frontend 1"]
            F2["🌐 Frontend 2"]
            F3["🌐 Frontend N"]
        end
        
        subgraph "Backend Cluster"
            subgraph "Proxy Cluster"
                P1["🔀 Proxy 1"]
                P2["🔀 Proxy 2"]
            end
            
            subgraph "API Cluster"
                A1["🔑 API 1"]
                A2["🔑 API 2"]
                A3["🔑 API N"]
            end
            
            subgraph "Docs Cluster"
                D1["📁 Docs 1"]
                D2["📁 Docs 2"]
            end
            
            subgraph "Main Cluster"
                M1["🏠 Main 1"]
                M2["🏠 Main 2"]
            end
        end
    end
    
    subgraph "💾 Data Layer"
        subgraph "Database Cluster"
            DB1["🗄️ Primary DB"]
            DB2["🗄️ Read Replica 1"]
            DB3["🗄️ Read Replica 2"]
        end
        
        subgraph "Cache Cluster"
            R1["💾 Redis Master"]
            R2["💾 Redis Slave 1"]
            R3["💾 Redis Slave 2"]
        end
        
        subgraph "Storage"
            FS["📂 File Storage"]
            BK["💿 Backup Storage"]
        end
    end
    
    subgraph "📊 Monitoring"
        MON["📈 Monitoring Stack"]
        LOG["📝 Logging Stack"]
        ALT["🚨 Alerting"]
    end
    
    U --> CDN
    CDN --> LB
    LB --> SSL
    SSL --> F1
    SSL --> F2
    SSL --> F3
    
    F1 --> P1
    F2 --> P2
    F3 --> P1
    
    P1 --> A1
    P1 --> A2
    P2 --> A2
    P2 --> A3
    
    P1 --> D1
    P2 --> D2
    
    P1 --> M1
    P2 --> M2
    
    A1 --> DB1
    A2 --> DB2
    A3 --> DB3
    
    A1 --> R1
    A2 --> R2
    A3 --> R3
    
    D1 --> FS
    D2 --> FS
    
    FS --> BK
    
    style U fill:#e1f5fe
    style LB fill:#fff3e0
    style DB1 fill:#e8f5e8
    style R1 fill:#fce4ec
```

## 🌍 Ambienti di Deployment

### Development Environment

```mermaid
graph TD
    subgraph "💻 Local Development"
        DEV["👨‍💻 Developer Machine"]
        
        subgraph "Frontend"
            VD["Vite Dev Server<br/>:5173"]
            SB["Storybook<br/>:6006"]
        end
        
        subgraph "Backend"
            MS["Main Server<br/>:3001"]
            AS["API Server<br/>:4001"]
            DS["Docs Server<br/>:4002"]
            PS["Proxy Server<br/>:8888"]
        end
        
        subgraph "Data"
            LDB["Local PostgreSQL<br/>:5432"]
            LRD["Local Redis<br/>:6379"]
        end
        
        subgraph "Tools"
            HMR["🔥 Hot Module Reload"]
            NM["📦 Nodemon"]
            PG["🐘 PostgreSQL"]
            RDS["💾 Redis"]
        end
    end
    
    DEV --> VD
    DEV --> SB
    DEV --> MS
    DEV --> AS
    DEV --> DS
    DEV --> PS
    
    AS --> LDB
    AS --> LRD
    
    style DEV fill:#e1f5fe
    style VD fill:#c8e6c9
    style HMR fill:#ffcdd2
```

#### Development Setup
```bash
# Environment setup
npm install
npm run setup:dev

# Database setup
npm run db:migrate
npm run db:seed

# Start development servers
npm run dev          # All servers
npm run dev:frontend # Frontend only
npm run dev:backend  # Backend only
npm run storybook    # Component library
```

### Staging Environment

```mermaid
graph TD
    subgraph "🧪 Staging Infrastructure"
        subgraph "Load Balancer"
            SLB["Nginx<br/>staging.app.com"]
        end
        
        subgraph "Application Servers"
            SF["Frontend Server<br/>PM2"]
            SP["Proxy Server<br/>PM2"]
            SA["API Server<br/>PM2"]
            SD["Docs Server<br/>PM2"]
            SM["Main Server<br/>PM2"]
        end
        
        subgraph "Data Layer"
            SDB["PostgreSQL<br/>Staging DB"]
            SRD["Redis<br/>Staging Cache"]
            SFS["File Storage<br/>Staging"]
        end
        
        subgraph "Monitoring"
            SMON["Monitoring<br/>Grafana"]
            SLOG["Logging<br/>ELK Stack"]
        end
        
        subgraph "CI/CD"
            GHA["GitHub Actions"]
            DOC["Docker Registry"]
        end
    end
    
    GHA --> DOC
    DOC --> SF
    DOC --> SP
    DOC --> SA
    DOC --> SD
    DOC --> SM
    
    SLB --> SF
    SF --> SP
    SP --> SA
    SP --> SD
    SP --> SM
    
    SA --> SDB
    SA --> SRD
    SD --> SFS
    
    style SLB fill:#fff3e0
    style GHA fill:#e8f5e8
    style SDB fill:#e3f2fd
```

#### Staging Configuration
```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/staging.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - frontend
      - proxy

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    environment:
      - NODE_ENV=staging
      - VITE_API_URL=https://staging-api.app.com
    volumes:
      - ./dist:/usr/share/nginx/html

  proxy:
    build:
      context: ./backend
      dockerfile: Dockerfile.proxy
    environment:
      - NODE_ENV=staging
      - PORT=8888
    ports:
      - "8888:8888"
    depends_on:
      - api
      - docs
      - main

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.api
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${STAGING_DATABASE_URL}
      - REDIS_URL=${STAGING_REDIS_URL}
    ports:
      - "4001:4001"
    depends_on:
      - postgres
      - redis

  docs:
    build:
      context: ./backend
      dockerfile: Dockerfile.docs
    environment:
      - NODE_ENV=staging
      - GOOGLE_CREDENTIALS=${STAGING_GOOGLE_CREDENTIALS}
    ports:
      - "4002:4002"
    volumes:
      - ./uploads:/app/uploads

  main:
    build:
      context: ./backend
      dockerfile: Dockerfile.main
    environment:
      - NODE_ENV=staging
    ports:
      - "3001:3001"

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=staging_db
      - POSTGRES_USER=${STAGING_DB_USER}
      - POSTGRES_PASSWORD=${STAGING_DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups

  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Production Environment

```mermaid
graph TD
    subgraph "🚀 Production Infrastructure"
        subgraph "Edge Layer"
            CDN["🌐 CloudFlare CDN"]
            WAF["🛡️ Web Application Firewall"]
        end
        
        subgraph "Load Balancer Cluster"
            LB1["⚖️ Load Balancer 1<br/>(Primary)"]
            LB2["⚖️ Load Balancer 2<br/>(Backup)"]
        end
        
        subgraph "Application Cluster"
            subgraph "Frontend Nodes"
                F1["🌐 Frontend 1"]
                F2["🌐 Frontend 2"]
                F3["🌐 Frontend 3"]
            end
            
            subgraph "Backend Nodes"
                B1["🔧 Backend Cluster 1"]
                B2["🔧 Backend Cluster 2"]
                B3["🔧 Backend Cluster 3"]
            end
        end
        
        subgraph "Data Cluster"
            subgraph "Database"
                DBM["🗄️ PostgreSQL Master"]
                DBS1["🗄️ PostgreSQL Slave 1"]
                DBS2["🗄️ PostgreSQL Slave 2"]
            end
            
            subgraph "Cache"
                RM["💾 Redis Master"]
                RS1["💾 Redis Slave 1"]
                RS2["💾 Redis Slave 2"]
            end
            
            subgraph "Storage"
                NFS["📂 NFS Storage"]
                S3["☁️ S3 Backup"]
            end
        end
        
        subgraph "Monitoring & Logging"
            PROM["📊 Prometheus"]
            GRAF["📈 Grafana"]
            ELK["📝 ELK Stack"]
            ALERT["🚨 AlertManager"]
        end
    end
    
    CDN --> WAF
    WAF --> LB1
    WAF --> LB2
    
    LB1 --> F1
    LB1 --> F2
    LB2 --> F2
    LB2 --> F3
    
    F1 --> B1
    F2 --> B2
    F3 --> B3
    
    B1 --> DBM
    B2 --> DBS1
    B3 --> DBS2
    
    B1 --> RM
    B2 --> RS1
    B3 --> RS2
    
    B1 --> NFS
    B2 --> NFS
    B3 --> NFS
    
    NFS --> S3
    
    style CDN fill:#e1f5fe
    style WAF fill:#ffcdd2
    style LB1 fill:#fff3e0
    style DBM fill:#e8f5e8
    style RM fill:#fce4ec
```

## 🐳 Containerization Strategy

### Docker Architecture

```mermaid
graph TD
    subgraph "🐳 Docker Containers"
        subgraph "Frontend Container"
            FD["Nginx + Static Files"]
            FB["Built React App"]
        end
        
        subgraph "Backend Containers"
            BC1["API Server<br/>Node.js + Express"]
            BC2["Docs Server<br/>Node.js + Express"]
            BC3["Proxy Server<br/>Node.js + Express"]
            BC4["Main Server<br/>Node.js + Express"]
        end
        
        subgraph "Data Containers"
            DC1["PostgreSQL<br/>Official Image"]
            DC2["Redis<br/>Official Image"]
        end
        
        subgraph "Utility Containers"
            UC1["Migration Runner"]
            UC2["Backup Service"]
            UC3["Health Checker"]
        end
    end
    
    FB --> FD
    BC1 --> DC1
    BC1 --> DC2
    BC2 --> DC1
    BC3 --> BC1
    BC3 --> BC2
    BC3 --> BC4
    
    style FD fill:#e1f5fe
    style BC1 fill:#e8f5e8
    style DC1 fill:#fff3e0
```

### Dockerfile Examples

#### Frontend Dockerfile
```dockerfile
# Dockerfile.frontend
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# Dockerfile.api
FROM node:18-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4001/health || exit 1

EXPOSE 4001

CMD ["node", "servers/api-server.js"]
```

## ⚙️ Process Management

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'main-server',
      script: './server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'api-server',
      script: './servers/api-server.js',
      cwd: './backend',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048'
    },
    {
      name: 'docs-server',
      script: './servers/documents-server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4002
      },
      error_file: './logs/docs-error.log',
      out_file: './logs/docs-out.log',
      log_file: './logs/docs-combined.log',
      time: true,
      max_memory_restart: '1G'
    },
    {
      name: 'proxy-server',
      script: './servers/proxy-server.js',
      cwd: './backend',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8888
      },
      error_file: './logs/proxy-error.log',
      out_file: './logs/proxy-out.log',
      log_file: './logs/proxy-combined.log',
      time: true,
      max_memory_restart: '512M'
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd backend && npm ci
      
      - name: Run linting
        run: |
          npm run lint
          npm run lint:backend
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run tests
        run: |
          npm run test:coverage
          npm run test:backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
      
      - name: Build and push Docker images
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /var/www/staging
            docker-compose pull
            docker-compose up -d
            docker system prune -f

  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /var/www/production
            docker-compose pull
            docker-compose up -d --no-deps --build
            docker system prune -f
      
      - name: Run health checks
        run: |
          sleep 30
          curl -f https://api.example.com/health || exit 1
          curl -f https://app.example.com/ || exit 1
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

## 📊 Monitoring e Observability

### Monitoring Stack

```mermaid
graph TD
    subgraph "📊 Monitoring Infrastructure"
        subgraph "Metrics Collection"
            PROM["📈 Prometheus"]
            NODE["🖥️ Node Exporter"]
            APP["📱 App Metrics"]
        end
        
        subgraph "Visualization"
            GRAF["📊 Grafana"]
            DASH["📋 Dashboards"]
        end
        
        subgraph "Logging"
            ELK["📝 ELK Stack"]
            FLUENTD["🌊 Fluentd"]
            LOGS["📄 Application Logs"]
        end
        
        subgraph "Alerting"
            AM["🚨 AlertManager"]
            SLACK["💬 Slack"]
            EMAIL["📧 Email"]
            PD["📞 PagerDuty"]
        end
        
        subgraph "Tracing"
            JAEGER["🔍 Jaeger"]
            TRACE["📊 Distributed Tracing"]
        end
    end
    
    NODE --> PROM
    APP --> PROM
    PROM --> GRAF
    GRAF --> DASH
    
    LOGS --> FLUENTD
    FLUENTD --> ELK
    
    PROM --> AM
    AM --> SLACK
    AM --> EMAIL
    AM --> PD
    
    APP --> JAEGER
    JAEGER --> TRACE
    
    style PROM fill:#e8f5e8
    style GRAF fill:#e1f5fe
    style ELK fill:#fff3e0
    style AM fill:#ffcdd2
```

### Health Check Endpoints

```typescript
// Health check implementation
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'error';
  }

  try {
    // Redis check
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (error) {
    health.checks.redis = 'error';
    health.status = 'error';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = memUsagePercent < 90 ? 'ok' : 'warning';

  // Disk check (simplified)
  const diskUsage = await checkDiskUsage();
  health.checks.disk = diskUsage < 90 ? 'ok' : 'warning';

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

## 🔒 Security Considerations

### Security Layers

```mermaid
graph TD
    subgraph "🔒 Security Architecture"
        subgraph "Network Security"
            FW["🔥 Firewall"]
            VPN["🔐 VPN Access"]
            WAF["🛡️ Web Application Firewall"]
        end
        
        subgraph "Application Security"
            SSL["🔐 SSL/TLS"]
            JWT["🎫 JWT Tokens"]
            RBAC["👥 Role-Based Access"]
            RATE["⏱️ Rate Limiting"]
        end
        
        subgraph "Data Security"
            ENC["🔒 Encryption at Rest"]
            BACKUP["💿 Encrypted Backups"]
            AUDIT["📝 Audit Logs"]
        end
        
        subgraph "Infrastructure Security"
            SCAN["🔍 Vulnerability Scanning"]
            PATCH["🔧 Security Patches"]
            MON["👁️ Security Monitoring"]
        end
    end
    
    style FW fill:#ffcdd2
    style SSL fill:#c8e6c9
    style ENC fill:#e1f5fe
    style SCAN fill:#fff3e0
```

### Security Configuration

```nginx
# nginx security configuration
server {
    listen 443 ssl http2;
    server_name app.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/app.example.com.crt;
    ssl_certificate_key /etc/ssl/private/app.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Hide server information
    server_tokens off;
    
    location / {
        proxy_pass http://frontend_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📈 Scaling Strategy

### Horizontal Scaling

```mermaid
graph LR
    subgraph "📈 Scaling Approach"
        subgraph "Current Load"
            C1["2 Frontend"]
            C2["4 API"]
            C3["2 Docs"]
            C4["1 DB Master"]
        end
        
        subgraph "Medium Load"
            M1["4 Frontend"]
            M2["8 API"]
            M3["4 Docs"]
            M4["1 DB Master<br/>2 Read Replicas"]
        end
        
        subgraph "High Load"
            H1["8 Frontend"]
            H2["16 API"]
            H3["8 Docs"]
            H4["1 DB Master<br/>4 Read Replicas<br/>Redis Cluster"]
        end
    end
    
    C1 --> M1
    C2 --> M2
    C3 --> M3
    C4 --> M4
    
    M1 --> H1
    M2 --> H2
    M3 --> H3
    M4 --> H4
    
    style C1 fill:#e8f5e8
    style M1 fill:#fff3e0
    style H1 fill:#ffcdd2
```

---

**Precedente:** [Component Architecture](./component-architecture.md)  
**Prossimo:** [API Documentation](../api/api-reference.md)  
**Correlato:** [System Overview](./system-overview.md)