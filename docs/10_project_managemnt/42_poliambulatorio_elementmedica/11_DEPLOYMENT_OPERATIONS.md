# 🚀 DEPLOYMENT & OPERATIONS - Poliambulatorio ElementMedica

**Versione**: 1.0  
**Data**: 2025-01-14  
**Documento**: 11_DEPLOYMENT_OPERATIONS.md

---

## 📋 INDICE

1. [Architettura Infrastruttura](#architettura-infrastruttura)
2. [Environment Strategy](#environment-strategy)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Deployment Procedures](#deployment-procedures)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Logging Strategy](#logging-strategy)
7. [Backup & Recovery](#backup--recovery)
8. [Incident Response](#incident-response)
9. [Scaling Strategy](#scaling-strategy)
10. [Security Operations](#security-operations)
11. [Maintenance Windows](#maintenance-windows)
12. [Runbooks](#runbooks)

---

## 1. ARCHITETTURA INFRASTRUTTURA

### 1.1 Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌─────────────────┐                               │
│                        │   CloudFlare    │                               │
│                        │   WAF + CDN     │                               │
│                        └────────┬────────┘                               │
│                                 │                                        │
│                        ┌────────▼────────┐                               │
│                        │  Load Balancer  │                               │
│                        │    (nginx)      │                               │
│                        └────────┬────────┘                               │
│                                 │                                        │
│              ┌──────────────────┼──────────────────┐                    │
│              │                  │                  │                     │
│     ┌────────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐            │
│     │  Proxy Server   │ │  Frontend   │ │   API Server    │            │
│     │   Port 4003     │ │  Port 5173  │ │   Port 4001     │            │
│     │ (Rate Limit,    │ │  (Vite/Nginx│ │ (Express,       │            │
│     │  CORS, Routing) │ │   Static)   │ │  Prisma, Auth)  │            │
│     └────────┬────────┘ └─────────────┘ └────────┬────────┘            │
│              │                                    │                      │
│              │         ┌──────────────┐          │                      │
│              └────────▶│  Documents   │◀─────────┘                      │
│                        │  Server 4002 │                                  │
│                        │ (PDF, Puppeteer)                               │
│                        └──────┬───────┘                                  │
│                               │                                          │
│     ┌─────────────────────────┼─────────────────────────┐               │
│     │                         │                         │                │
│     ▼                         ▼                         ▼                │
│  ┌──────────┐          ┌──────────┐           ┌──────────────┐          │
│  │PostgreSQL│          │  Redis   │           │     S3       │          │
│  │  Primary │          │ (Cache,  │           │  (Documents) │          │
│  │  + Read  │          │  Queue)  │           │              │          │
│  │ Replicas │          └──────────┘           └──────────────┘          │
│  └──────────┘                                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Server Specifications

| Component | CPU | RAM | Storage | Instances |
|-----------|-----|-----|---------|-----------|
| **API Server** | 4 vCPU | 8 GB | 50 GB SSD | 2 (HA) |
| **Proxy Server** | 2 vCPU | 4 GB | 20 GB SSD | 2 (HA) |
| **Documents Server** | 4 vCPU | 16 GB | 50 GB SSD | 2 (HA) |
| **PostgreSQL Primary** | 4 vCPU | 16 GB | 500 GB SSD | 1 |
| **PostgreSQL Replica** | 4 vCPU | 16 GB | 500 GB SSD | 1 |
| **Redis** | 2 vCPU | 8 GB | 20 GB SSD | 1 (Cluster ready) |

### 1.3 Network Configuration

```yaml
# Network topology
networks:
  frontend:
    subnet: 10.0.1.0/24
    description: "Public facing services"
  
  backend:
    subnet: 10.0.2.0/24
    description: "API and application servers"
  
  data:
    subnet: 10.0.3.0/24
    description: "Databases and storage"

# Firewall rules
firewall:
  ingress:
    - port: 443
      source: 0.0.0.0/0
      description: "HTTPS traffic"
    - port: 80
      source: 0.0.0.0/0
      description: "HTTP (redirect to HTTPS)"
  
  internal:
    - ports: [4001, 4002, 4003]
      source: 10.0.1.0/24
      description: "Internal services"
    - port: 5432
      source: 10.0.2.0/24
      description: "Database access"
    - port: 6379
      source: 10.0.2.0/24
      description: "Redis access"
```

---

## 2. ENVIRONMENT STRATEGY

### 2.1 Environment Matrix

| Environment | Purpose | Branch | Auto Deploy | Data |
|-------------|---------|--------|-------------|------|
| **Local** | Development | any | Manual | Seed |
| **CI** | Testing | any | PR trigger | Generated |
| **Dev** | Integration | develop | On merge | Seed |
| **Staging** | UAT, Pre-prod | main | On merge | Anonymized |
| **Production** | Live | main | Manual approve | Real |

### 2.2 Environment Configuration

```yaml
# config/environments.yaml
development:
  database:
    url: postgresql://dev:dev@localhost:5432/elementmedica_dev
  redis:
    url: redis://localhost:6379
  api:
    port: 4001
    cors_origins: ["http://localhost:5173"]
  features:
    debug_mode: true
    test_routes: true
    mock_email: true

staging:
  database:
    url: ${DATABASE_URL}
  redis:
    url: ${REDIS_URL}
  api:
    port: 4001
    cors_origins: ["https://staging.elementmedica.it"]
  features:
    debug_mode: false
    test_routes: false
    mock_email: true

production:
  database:
    url: ${DATABASE_URL}
    pool_size: 20
    ssl: true
  redis:
    url: ${REDIS_URL}
    cluster: true
  api:
    port: 4001
    cors_origins: ["https://app.elementmedica.it"]
  features:
    debug_mode: false
    test_routes: false
    mock_email: false
```

### 2.3 Secret Management

```
┌─────────────────────────────────────────────────────────────┐
│                    SECRET MANAGEMENT                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   Vault /    │                                           │
│  │ AWS Secrets  │◀───── Rotate every 90 days               │
│  │   Manager    │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────┐           │
│  │           Environment Injection               │           │
│  ├──────────────────────────────────────────────┤           │
│  │ DATABASE_URL        = ******                  │           │
│  │ REDIS_URL           = ******                  │           │
│  │ JWT_SECRET          = ******                  │           │
│  │ ENCRYPTION_KEY      = ******                  │           │
│  │ AWS_ACCESS_KEY_ID   = ******                  │           │
│  │ AWS_SECRET_KEY      = ******                  │           │
│  │ SMTP_PASSWORD       = ******                  │           │
│  │ SIGNING_KEY         = ******                  │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ⚠️  NEVER in code, logs, or error messages                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. CI/CD PIPELINE

### 3.1 Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │  PUSH   │──▶│  BUILD  │──▶│  TEST   │──▶│ STAGING │──▶│  PROD   │   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│       │             │             │             │             │         │
│       │             │             │             │             │         │
│       ▼             ▼             ▼             ▼             ▼         │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│  │  Lint   │   │ npm ci  │   │  Unit   │   │  E2E    │   │ Health  │   │
│  │TypeCheck│   │ Build   │   │ Integr. │   │Smoke    │   │ Check   │   │
│  │Security │   │ Docker  │   │Coverage │   │ Tests   │   │Rollback │   │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│                                                                          │
│  Duration:  ~2min      ~5min      ~10min      ~15min      ~5min         │
│  Total: ~37 minutes                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================
  # STAGE 1: Quality Gates
  # ============================================
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type Check
        run: npm run type-check
      
      - name: Security Audit
        run: npm audit --audit-level=high

  # ============================================
  # STAGE 2: Build
  # ============================================
  build:
    needs: quality
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate version
        id: version
        run: echo "version=$(date +'%Y%m%d')-${{ github.run_number }}" >> $GITHUB_OUTPUT
      
      - name: Build Frontend
        run: |
          npm ci
          npm run build
      
      - name: Build Docker images
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:${{ steps.version.outputs.version }} -f Dockerfile.api .
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/proxy:${{ steps.version.outputs.version }} -f Dockerfile.proxy .
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/docs:${{ steps.version.outputs.version }} -f Dockerfile.docs .
      
      - name: Push to Registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ${{ env.REGISTRY }} -u ${{ github.actor }} --password-stdin
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/api:${{ steps.version.outputs.version }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/proxy:${{ steps.version.outputs.version }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/docs:${{ steps.version.outputs.version }}

  # ============================================
  # STAGE 3: Test
  # ============================================
  test:
    needs: build
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: elementmedica_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/elementmedica_test
      
      - name: Unit tests
        run: npm run test:unit -- --coverage
      
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/elementmedica_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true

  # ============================================
  # STAGE 4: Deploy Staging
  # ============================================
  deploy-staging:
    needs: [build, test]
    if: github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to Staging
        run: |
          ssh deploy@staging.elementmedica.it << 'EOF'
            cd /opt/elementmedica
            docker-compose pull
            docker-compose up -d
            sleep 10
            curl -f http://localhost:4001/health || exit 1
            curl -f http://localhost:4002/health || exit 1
            curl -f http://localhost:4003/health || exit 1
          EOF
      
      - name: Run E2E tests
        run: npm run test:e2e:staging

  # ============================================
  # STAGE 5: Deploy Production
  # ============================================
  deploy-production:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Backup Database
        run: |
          ssh deploy@prod.elementmedica.it << 'EOF'
            pg_dump $DATABASE_URL > /backups/pre-deploy-$(date +%Y%m%d%H%M%S).sql
          EOF
      
      - name: Deploy to Production
        run: |
          ssh deploy@prod.elementmedica.it << 'EOF'
            cd /opt/elementmedica
            
            # Rolling update
            docker-compose pull
            docker-compose up -d --no-deps --scale api=2 api
            sleep 30
            
            # Health check
            for i in {1..10}; do
              if curl -sf http://localhost:4001/health; then
                echo "API healthy"
                break
              fi
              sleep 5
            done
            
            # Scale down old instances
            docker-compose up -d --no-deps api
          EOF
      
      - name: Smoke Tests
        run: |
          curl -sf https://app.elementmedica.it/health
          curl -sf https://app.elementmedica.it/api/v1/health
      
      - name: Notify Success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-type: application/json' \
            -d '{"text":"✅ Production deployment successful: ${{ needs.build.outputs.version }}"}'
      
      - name: Rollback on Failure
        if: failure()
        run: |
          ssh deploy@prod.elementmedica.it << 'EOF'
            cd /opt/elementmedica
            docker-compose down
            docker-compose up -d --force-recreate
          EOF
```

---

## 4. DEPLOYMENT PROCEDURES

### 4.1 Pre-deployment Checklist

```markdown
## Pre-deployment Checklist

### Code Quality
- [ ] All tests passing (Unit, Integration, E2E)
- [ ] Code coverage ≥ 75%
- [ ] No TypeScript errors
- [ ] No security vulnerabilities (npm audit)
- [ ] Code review approved
- [ ] PR merged to main

### Database
- [ ] Migration scripts tested in staging
- [ ] Rollback scripts prepared
- [ ] Backup completed
- [ ] No breaking schema changes (or migration plan ready)

### Infrastructure
- [ ] Staging environment validated
- [ ] Health checks passing
- [ ] Monitoring dashboards ready
- [ ] Alerting configured

### Communication
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Support team briefed
- [ ] Release notes prepared

### Post-deployment
- [ ] Smoke test plan ready
- [ ] Rollback procedure documented
- [ ] On-call engineer assigned
```

### 4.2 Zero-Downtime Deployment

```bash
#!/bin/bash
# scripts/deploy-zero-downtime.sh

set -e

VERSION=$1
ENVIRONMENT=$2

echo "🚀 Starting zero-downtime deployment v$VERSION to $ENVIRONMENT"

# Step 1: Pull new images
echo "📦 Pulling new images..."
docker pull ghcr.io/elementmedica/api:$VERSION
docker pull ghcr.io/elementmedica/proxy:$VERSION
docker pull ghcr.io/elementmedica/docs:$VERSION

# Step 2: Start new containers alongside old ones
echo "🔄 Starting new containers..."
docker-compose up -d --no-deps --scale api=2 api

# Step 3: Wait for health checks
echo "⏳ Waiting for health checks..."
for i in {1..30}; do
  if docker exec elementmedica-api-2 curl -sf http://localhost:4001/health; then
    echo "✅ New container healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Health check failed, rolling back"
    docker-compose up -d --no-deps api
    exit 1
  fi
  sleep 2
done

# Step 4: Update load balancer to new container
echo "🔀 Switching traffic..."
docker exec nginx nginx -s reload

# Step 5: Stop old container
echo "🛑 Stopping old container..."
docker stop elementmedica-api-1
docker rm elementmedica-api-1

# Step 6: Rename new container
docker rename elementmedica-api-2 elementmedica-api-1

# Step 7: Repeat for other services
echo "📄 Deploying documents server..."
# ... similar process

echo "🎉 Deployment complete!"
```

### 4.3 Database Migration Procedure

```bash
#!/bin/bash
# scripts/migrate-production.sh

set -e

echo "🗄️ Starting database migration"

# Step 1: Create backup
echo "💾 Creating backup..."
BACKUP_FILE="/backups/pre-migration-$(date +%Y%m%d%H%M%S).sql"
pg_dump $DATABASE_URL > $BACKUP_FILE
echo "Backup saved to $BACKUP_FILE"

# Step 2: Verify backup
echo "✅ Verifying backup..."
if [ ! -s $BACKUP_FILE ]; then
  echo "❌ Backup file is empty!"
  exit 1
fi

# Step 3: Run migration
echo "📝 Running migration..."
npx prisma migrate deploy

# Step 4: Verify migration
echo "🔍 Verifying migration..."
npx prisma migrate status

# Step 5: Run health checks
echo "🏥 Running health checks..."
curl -sf http://localhost:4001/health || {
  echo "❌ Health check failed, consider rollback"
  echo "Rollback command: psql $DATABASE_URL < $BACKUP_FILE"
  exit 1
}

echo "✅ Migration complete!"
```

---

## 5. MONITORING & ALERTING

### 5.1 Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Prometheus  │──▶│   Grafana    │──▶│    Slack     │    │
│  │   Metrics    │   │  Dashboards  │   │   Alerts     │    │
│  └──────┬───────┘   └──────────────┘   └──────────────┘    │
│         │                                                    │
│         │ Scrape                                             │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Applications                       │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │   │
│  │  │  API   │  │ Proxy  │  │  Docs  │  │ Redis  │     │   │
│  │  │ :9090  │  │ :9091  │  │ :9092  │  │ :9121  │     │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐                        │
│  │   Loki       │   │ Jaeger/Tempo │                        │
│  │   (Logs)     │   │  (Tracing)   │                        │
│  └──────────────┘   └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| **API Response Time (p95)** | < 200ms | > 500ms | > 1000ms |
| **Error Rate** | < 0.1% | > 1% | > 5% |
| **CPU Usage** | < 60% | > 80% | > 90% |
| **Memory Usage** | < 70% | > 85% | > 95% |
| **Database Connections** | < 80% pool | > 90% | > 95% |
| **Disk Usage** | < 70% | > 85% | > 95% |
| **Request Rate** | baseline | +50% | +100% |
| **Queue Length (BullMQ)** | < 100 | > 500 | > 1000 |

### 5.3 Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: elementmedica
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) 
          / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # Slow Response Time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow API response time"
          description: "P95 latency is {{ $value | humanizeDuration }}"
      
      # Database Connection Pool Exhaustion
      - alert: DatabasePoolExhausted
        expr: pg_pool_available_connections / pg_pool_max_connections < 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
      
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
      
      # Service Down
      - alert: ServiceDown
        expr: up{job=~"api|proxy|docs"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
```

### 5.4 Grafana Dashboards

```json
// Dashboard: ElementMedica Overview
{
  "title": "ElementMedica Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        { "expr": "sum(rate(http_requests_total[5m]))" }
      ]
    },
    {
      "title": "Error Rate",
      "type": "gauge",
      "targets": [
        { "expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))" }
      ],
      "thresholds": [
        { "value": 0.01, "color": "green" },
        { "value": 0.05, "color": "orange" },
        { "value": 0.1, "color": "red" }
      ]
    },
    {
      "title": "Response Time P95",
      "type": "stat",
      "targets": [
        { "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))" }
      ]
    },
    {
      "title": "Active Users",
      "type": "stat",
      "targets": [
        { "expr": "sum(active_sessions)" }
      ]
    },
    {
      "title": "Database Queries/sec",
      "type": "graph",
      "targets": [
        { "expr": "rate(prisma_client_queries_total[5m])" }
      ]
    },
    {
      "title": "Queue Jobs",
      "type": "graph",
      "targets": [
        { "expr": "bullmq_waiting_jobs" },
        { "expr": "bullmq_active_jobs" },
        { "expr": "bullmq_completed_jobs" }
      ]
    }
  ]
}
```

---

## 6. LOGGING STRATEGY

### 6.1 Log Levels & Usage

| Level | When to Use | Example |
|-------|-------------|---------|
| **ERROR** | Errors requiring attention | Database connection failed |
| **WARN** | Potentially harmful situations | Rate limit approaching |
| **INFO** | Significant business events | User login, appointment created |
| **DEBUG** | Detailed diagnostic info | Request/response details |
| **TRACE** | Very detailed, usually off | Function entry/exit |

### 6.2 Structured Logging

```typescript
// backend/utils/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: () => ({
      service: 'elementmedica-api',
      version: process.env.APP_VERSION,
      environment: process.env.NODE_ENV
    })
  },
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'codiceFiscale',
      'creditCard'
    ],
    censor: '***REDACTED***'
  }
});

// Usage example
logger.info({
  event: 'appointment_created',
  appointmentId: '123',
  patientId: 'p456',
  tenantId: 't789',
  userId: 'u012',
  duration: 45
}, 'New appointment created');

// Error logging
logger.error({
  event: 'database_error',
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack
  },
  query: 'findMany appointments',
  tenantId: 't789'
}, 'Database query failed');
```

### 6.3 Log Aggregation

```yaml
# docker-compose.logging.yml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

---

## 7. BACKUP & RECOVERY

### 7.1 Backup Strategy

| Data Type | Frequency | Retention | Location |
|-----------|-----------|-----------|----------|
| **Database Full** | Daily 02:00 | 30 days | S3 + Cross-region |
| **Database WAL** | Continuous | 7 days | S3 |
| **Files (S3)** | Cross-region replication | Indefinite | S3 secondary |
| **Config/Secrets** | On change | 90 days | Vault |
| **Logs** | Continuous | 90 days | Loki |

### 7.2 Backup Scripts

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/elementmedica_$DATE.sql.gz"
S3_BUCKET="s3://elementmedica-backups"

# Create backup
echo "📦 Creating backup..."
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Verify backup
echo "✅ Verifying backup..."
if ! gunzip -t $BACKUP_FILE; then
  echo "❌ Backup verification failed!"
  exit 1
fi

# Upload to S3
echo "☁️ Uploading to S3..."
aws s3 cp $BACKUP_FILE $S3_BUCKET/database/

# Upload to secondary region
aws s3 cp $BACKUP_FILE $S3_BUCKET-dr/database/ --region eu-west-1

# Cleanup old local backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup complete: $BACKUP_FILE"
```

### 7.3 Recovery Procedures

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./restore-database.sh <backup-file>"
  echo "Available backups:"
  aws s3 ls s3://elementmedica-backups/database/ | tail -10
  exit 1
fi

echo "⚠️ WARNING: This will restore database from $BACKUP_FILE"
echo "Current data will be LOST!"
read -p "Are you sure? (type 'yes'): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Download backup
echo "📥 Downloading backup..."
aws s3 cp s3://elementmedica-backups/database/$BACKUP_FILE /tmp/restore.sql.gz

# Stop applications
echo "🛑 Stopping applications..."
pm2 stop all

# Restore
echo "🔄 Restoring database..."
gunzip -c /tmp/restore.sql.gz | psql $DATABASE_URL

# Restart applications
echo "🚀 Restarting applications..."
pm2 start all

# Verify
echo "✅ Verifying restore..."
curl -sf http://localhost:4001/health

echo "✅ Restore complete!"
```

### 7.4 Disaster Recovery

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| **Single server failure** | 5 min | 0 | Auto-failover to replica |
| **AZ failure** | 15 min | 0 | Failover to secondary AZ |
| **Region failure** | 1 hour | 1 hour | Manual DR activation |
| **Data corruption** | 2 hours | 24 hours | Point-in-time recovery |
| **Ransomware** | 4 hours | 24 hours | Restore from offline backup |

---

## 8. INCIDENT RESPONSE

### 8.1 Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P1 Critical** | Service completely down | 15 min | Immediate |
| **P2 Major** | Major feature broken | 30 min | 1 hour |
| **P3 Moderate** | Minor feature impacted | 2 hours | 4 hours |
| **P4 Minor** | Cosmetic/informational | 24 hours | Next business day |

### 8.2 Incident Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  INCIDENT RESPONSE FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐                                                │
│  │  DETECT  │ ◀─── Alert / User Report / Monitoring         │
│  └────┬─────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐     ┌────────────────────────────────┐        │
│  │  TRIAGE  │────▶│ Severity: P1 | P2 | P3 | P4    │        │
│  └────┬─────┘     └────────────────────────────────┘        │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐                                                │
│  │ ASSIGN   │ ◀─── On-call engineer                         │
│  └────┬─────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐     ┌────────────────────────────────┐        │
│  │INVESTIGATE│───▶│ Logs | Metrics | Traces        │        │
│  └────┬─────┘     └────────────────────────────────┘        │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐                                                │
│  │  RESOLVE │ ◀─── Hotfix | Rollback | Config change        │
│  └────┬─────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐                                                │
│  │ VERIFY   │ ◀─── Health checks | User confirmation        │
│  └────┬─────┘                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────┐                                                │
│  │POST-MORT │ ◀─── Root cause | Action items               │
│  └──────────┘                                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 On-Call Rotation

```yaml
# on-call-schedule.yml
schedule:
  rotation: weekly
  start_day: monday
  start_time: "09:00"
  timezone: "Europe/Rome"

team:
  - name: "Developer 1"
    phone: "+39 xxx xxx xxxx"
    slack: "@dev1"
  - name: "Developer 2"
    phone: "+39 xxx xxx xxxx"
    slack: "@dev2"

escalation:
  - level: 1
    timeout: 15m
    contacts: [on-call]
  - level: 2
    timeout: 30m
    contacts: [tech-lead]
  - level: 3
    timeout: 60m
    contacts: [cto]
```

---

## 9. SCALING STRATEGY

### 9.1 Horizontal Scaling

```yaml
# kubernetes/api-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elementmedica-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: ghcr.io/elementmedica/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        readinessProbe:
          httpGet:
            path: /health
            port: 4001
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 4001
          initialDelaySeconds: 15
          periodSeconds: 20

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: elementmedica-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 9.2 Database Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE SCALING                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CURRENT (Vertical)           FUTURE (Horizontal)           │
│  ──────────────────           ───────────────────           │
│                                                              │
│  ┌──────────────┐             ┌──────────────┐              │
│  │   Primary    │             │   Primary    │              │
│  │  PostgreSQL  │             │  (Writes)    │              │
│  │  4CPU/16GB   │             └──────┬───────┘              │
│  └──────────────┘                    │                      │
│                                      │                      │
│         │                     ┌──────┴───────┐              │
│         │                     │              │              │
│         ▼               ┌─────▼─────┐  ┌─────▼─────┐       │
│  ┌──────────────┐       │  Replica  │  │  Replica  │       │
│  │   Replica    │       │  (Reads)  │  │  (Reads)  │       │
│  │  (Failover)  │       └───────────┘  └───────────┘       │
│  └──────────────┘                                           │
│                                                              │
│  PHASE 2: Connection Pooling (PgBouncer)                   │
│  PHASE 3: Read replicas for heavy queries                   │
│  PHASE 4: Sharding by tenant (if needed)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. SECURITY OPERATIONS

### 10.1 Security Hardening Checklist

```markdown
## Server Security

### Operating System
- [ ] Automatic security updates enabled
- [ ] SSH key-only authentication
- [ ] Firewall configured (ufw/iptables)
- [ ] Fail2ban installed
- [ ] Non-root user for services

### Network
- [ ] TLS 1.3 only
- [ ] HSTS enabled
- [ ] WAF configured (CloudFlare)
- [ ] DDoS protection enabled
- [ ] Internal services not exposed

### Application
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection

### Secrets
- [ ] All secrets in Vault/Secrets Manager
- [ ] No secrets in code or logs
- [ ] Regular rotation (90 days)
- [ ] Least privilege access

### Monitoring
- [ ] Security event logging
- [ ] Intrusion detection alerts
- [ ] Failed login monitoring
- [ ] Anomaly detection
```

### 10.2 Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  push:
    branches: [main]

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript
      - uses: github/codeql-action/analyze@v2

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
```

---

## 11. MAINTENANCE WINDOWS

### 11.1 Scheduled Maintenance

| Type | Frequency | Duration | Window |
|------|-----------|----------|--------|
| **Security patches** | Weekly | 30 min | Sun 02:00-02:30 |
| **Minor updates** | Bi-weekly | 1 hour | Sun 02:00-03:00 |
| **Major updates** | Monthly | 2 hours | Sun 01:00-03:00 |
| **Database maintenance** | Weekly | 15 min | Sun 03:00-03:15 |

### 11.2 Maintenance Notification Template

```markdown
## Scheduled Maintenance Notice

**Service**: ElementMedica Poliambulatorio
**Date**: [Date]
**Time**: [Start Time] - [End Time] (Europe/Rome)
**Impact**: [Brief description of impact]

### What's happening
[Description of maintenance work]

### What to expect
- The system will be [unavailable/in read-only mode/have degraded performance]
- Duration: approximately [X] minutes

### Actions required
[Any actions users need to take]

### Contact
For questions or concerns, contact [support email]
```

---

## 12. RUNBOOKS

### 12.1 Runbook: API Server Not Responding

```markdown
## Runbook: API Server Not Responding

### Symptoms
- Health check failing: `curl http://localhost:4001/health`
- 502/503 errors from load balancer
- No logs in API server

### Diagnostic Steps

1. **Check process status**
   ```bash
   pm2 status
   pm2 logs api-server --lines 100
   ```

2. **Check system resources**
   ```bash
   htop
   df -h
   free -m
   ```

3. **Check database connection**
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Check Redis connection**
   ```bash
   redis-cli ping
   ```

5. **Check network**
   ```bash
   netstat -tlnp | grep 4001
   curl -v http://localhost:4001/health
   ```

### Resolution Steps

**If process crashed:**
```bash
pm2 restart api-server
pm2 logs api-server --lines 50
```

**If out of memory:**
```bash
pm2 restart api-server --max-memory-restart 1500M
# Consider scaling up instance
```

**If database connection issue:**
```bash
# Check connection pool
pm2 restart api-server
# If persists, check database server
```

**If port conflict:**
```bash
lsof -i :4001
kill -9 <PID>
pm2 restart api-server
```

### Escalation
If unresolved after 15 minutes, escalate to Tech Lead.
```

### 12.2 Runbook: High Database CPU

```markdown
## Runbook: High Database CPU

### Symptoms
- Database CPU > 80%
- Slow API responses
- Connection timeouts

### Diagnostic Steps

1. **Identify slow queries**
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
   ORDER BY duration DESC;
   ```

2. **Check active connections**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   ```

3. **Check table statistics**
   ```sql
   SELECT relname, seq_scan, idx_scan, n_live_tup
   FROM pg_stat_user_tables
   ORDER BY seq_scan DESC
   LIMIT 10;
   ```

### Resolution Steps

**Kill long-running query:**
```sql
SELECT pg_terminate_backend(<pid>);
```

**VACUUM if needed:**
```sql
VACUUM ANALYZE;
```

**Add missing index (if identified):**
```sql
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

### Prevention
- Review query performance weekly
- Ensure indexes on foreign keys
- Use EXPLAIN ANALYZE on new queries
```

---

## 📎 ALLEGATI

### A. Useful Commands Quick Reference

```bash
# Health checks
curl http://localhost:4001/health  # API
curl http://localhost:4002/health  # Documents
curl http://localhost:4003/health  # Proxy

# PM2 commands
pm2 status
pm2 logs [process] --lines 100
pm2 restart [process]
pm2 monit

# Database
psql $DATABASE_URL
npx prisma studio

# Redis
redis-cli monitor
redis-cli info

# Docker
docker-compose ps
docker-compose logs -f [service]
docker stats
```

### B. Contact List

| Role | Name | Contact | Escalation Level |
|------|------|---------|------------------|
| On-call Engineer | Rotation | PagerDuty | L1 |
| Tech Lead | [Name] | [Phone] | L2 |
| DBA | [Name] | [Phone] | L2 |
| CTO | [Name] | [Phone] | L3 |
| Vendor Support | AWS | [Case URL] | External |

---

*Documento soggetto a revisione trimestrale*  
*Ultima revisione: 2025-01-14*
