# Deployment Guide - Proxy Server

## Panoramica

Questa guida descrive come deployare il proxy server ottimizzato in diversi ambienti, dalle configurazioni di sviluppo locale ai deployment di produzione su Kubernetes.

## Prerequisiti

### Software Richiesto

- **Node.js**: v18.x o superiore (raccomandato v20.x)
- **npm**: v9.x o superiore
- **PostgreSQL**: v13 o superiore (per l'API server)
- **Redis**: v6.x o superiore (opzionale, per session storage)

### Variabili d'Ambiente

Creare un file `.env` basato su `.env.example`:

```bash
# Server Configuration
NODE_ENV=production
PROXY_PORT=4003
API_SERVER_URL=http://localhost:4001
DOCS_SERVER_URL=http://localhost:4002
FRONTEND_URL=https://yourdomain.com

# Security
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/server.crt
SSL_KEY_PATH=/etc/ssl/private/server.key
HSTS_MAX_AGE=31536000

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
API_RATE_LIMIT_MAX=50
LOGIN_RATE_LIMIT_MAX=5
UPLOAD_RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info
ENABLE_ACCESS_LOG=true
ENABLE_SECURITY_LOG=true
LOG_RETENTION_DAYS=30

# Health Checks
HEALTH_CHECK_TIMEOUT=5000
DB_HEALTH_CHECK_ENABLED=true
EXTERNAL_SERVICES_CHECK_ENABLED=true

# Performance
REQUEST_TIMEOUT=30000
KEEP_ALIVE_TIMEOUT=5000
MAX_CONNECTIONS=1000

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
ENABLE_PROMETHEUS=true
```

## Deployment Locale

### Sviluppo

```bash
# Clone del repository
git clone <repository-url>
cd backend

# Installazione dipendenze
npm install

# Installazione dipendenze di test
cd tests && npm install && cd ..

# Setup ambiente di sviluppo
cp .env.example .env.development

# Avvio in modalità sviluppo
npm run dev:proxy

# Oppure con debug completo
DEBUG_ALL=true npm run dev:proxy
```

### Testing

```bash
# Test di qualità del codice
npm run quality

# Test unitari
npm test

# Test end-to-end
npm run test:e2e

# Test con coverage
npm run test:coverage
```

### Produzione Locale

```bash
# Build e ottimizzazione
npm ci --only=production

# Setup ambiente di produzione
cp .env.example .env.production

# Avvio in produzione
NODE_ENV=production npm run start:proxy
```

## Deployment con PM2

### Installazione PM2

```bash
npm install -g pm2
```

### Configurazione PM2

Creare `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'proxy-server',
    script: 'proxy-server.js',
    cwd: '/path/to/backend',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PROXY_PORT: 4003
    },
    env_production: {
      NODE_ENV: 'production',
      PROXY_PORT: 4003,
      ENABLE_HTTPS: true
    },
    log_file: '/var/log/proxy-server/combined.log',
    out_file: '/var/log/proxy-server/out.log',
    error_file: '/var/log/proxy-server/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'tests'],
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
```

### Comandi PM2

```bash
# Avvio
pm2 start ecosystem.config.js --env production

# Monitoring
pm2 monit
pm2 status
pm2 logs proxy-server

# Reload senza downtime
pm2 reload proxy-server

# Stop
pm2 stop proxy-server

# Restart
pm2 restart proxy-server

# Delete
pm2 delete proxy-server

# Salva configurazione
pm2 save
pm2 startup
```

## Deployment con Docker

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tests/package*.json ./tests/

# Install dependencies
RUN npm ci --only=production && \
    cd tests && npm ci --only=production

# Copy source code
COPY . .

# Run tests and quality checks
RUN npm run quality && \
    npm run test:unit

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proxy -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder --chown=proxy:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=proxy:nodejs /app/proxy ./proxy
COPY --from=builder --chown=proxy:nodejs /app/servers/proxy-server.js ./servers/
COPY --from=builder --chown=proxy:nodejs /app/package.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown proxy:nodejs /app/logs

# Switch to non-root user
USER proxy

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4003/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "servers/proxy-server.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  proxy-server:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: proxy-server
    restart: unless-stopped
    ports:
      - "4003:4003"
    environment:
      - NODE_ENV=production
      - PROXY_PORT=4003
      - API_SERVER_URL=http://api-server:4001
      - DOCS_SERVER_URL=http://docs-server:4002
      - FRONTEND_URL=http://frontend:5173
    volumes:
      - ./logs:/app/logs
      - ./ssl:/app/ssl:ro
    networks:
      - app-network
    depends_on:
      - api-server
      - docs-server
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4003/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  api-server:
    # API server configuration
    image: api-server:latest
    container_name: api-server
    ports:
      - "4001:4001"
    networks:
      - app-network

  docs-server:
    # Documents server configuration
    image: docs-server:latest
    container_name: docs-server
    ports:
      - "4002:4002"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  logs:
    driver: local
```

### Comandi Docker

```bash
# Build
docker build -t proxy-server:latest .

# Run singolo container
docker run -d \
  --name proxy-server \
  -p 4003:4003 \
  -e NODE_ENV=production \
  -v $(pwd)/logs:/app/logs \
  proxy-server:latest

# Docker Compose
docker-compose up -d
docker-compose logs -f proxy-server
docker-compose down

# Health check
docker exec proxy-server curl -f http://localhost:4003/healthz
```

## Deployment su Kubernetes

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: proxy-system
  labels:
    name: proxy-system
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: proxy-config
  namespace: proxy-system
data:
  NODE_ENV: "production"
  PROXY_PORT: "4003"
  API_SERVER_URL: "http://api-server.api-system:4001"
  DOCS_SERVER_URL: "http://docs-server.docs-system:4002"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
  API_RATE_LIMIT_MAX: "50"
  LOGIN_RATE_LIMIT_MAX: "5"
  HEALTH_CHECK_TIMEOUT: "5000"
  LOG_LEVEL: "info"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: proxy-secrets
  namespace: proxy-system
type: Opaque
data:
  SSL_CERT: <base64-encoded-cert>
  SSL_KEY: <base64-encoded-key>
  JWT_SECRET: <base64-encoded-secret>
```

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxy-server
  namespace: proxy-system
  labels:
    app: proxy-server
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: proxy-server
  template:
    metadata:
      labels:
        app: proxy-server
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "4003"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: proxy-server
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: proxy-server
        image: proxy-server:v1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 4003
          protocol: TCP
        envFrom:
        - configMapRef:
            name: proxy-config
        env:
        - name: SSL_CERT
          valueFrom:
            secretKeyRef:
              name: proxy-secrets
              key: SSL_CERT
        - name: SSL_KEY
          valueFrom:
            secretKeyRef:
              name: proxy-secrets
              key: SSL_KEY
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        startupProbe:
          httpGet:
            path: /healthz
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        - name: ssl-certs
          mountPath: /app/ssl
          readOnly: true
      volumes:
      - name: logs
        emptyDir: {}
      - name: ssl-certs
        secret:
          secretName: proxy-secrets
          items:
          - key: SSL_CERT
            path: server.crt
          - key: SSL_KEY
            path: server.key
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-server
  namespace: proxy-system
  labels:
    app: proxy-server
spec:
  type: ClusterIP
  ports:
  - port: 4003
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: proxy-server
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: proxy-server
  namespace: proxy-system
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: proxy-server-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: proxy-server
            port:
              number: 4003
```

### HorizontalPodAutoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: proxy-server-hpa
  namespace: proxy-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: proxy-server
  minReplicas: 3
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### ServiceAccount e RBAC

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: proxy-server
  namespace: proxy-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: proxy-server
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: proxy-server
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: proxy-server
subjects:
- kind: ServiceAccount
  name: proxy-server
  namespace: proxy-system
```

### Comandi Kubernetes

```bash
# Deploy
kubectl apply -f k8s/

# Status
kubectl get pods -n proxy-system
kubectl get svc -n proxy-system
kubectl get ingress -n proxy-system

# Logs
kubectl logs -f deployment/proxy-server -n proxy-system

# Health check
kubectl exec -it deployment/proxy-server -n proxy-system -- curl http://localhost:4003/healthz

# Port forward per test
kubectl port-forward svc/proxy-server 4003:4003 -n proxy-system

# Scale
kubectl scale deployment proxy-server --replicas=5 -n proxy-system

# Rolling update
kubectl set image deployment/proxy-server proxy-server=proxy-server:v1.1.0 -n proxy-system

# Rollback
kubectl rollout undo deployment/proxy-server -n proxy-system
```

## Monitoring e Logging

### Prometheus Metrics

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: proxy-server
  namespace: proxy-system
spec:
  selector:
    matchLabels:
      app: proxy-server
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Proxy Server Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(proxy_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(proxy_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Rate Limit Hits",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(proxy_rate_limit_hits_total[5m])",
            "legendFormat": "{{type}}"
          }
        ]
      }
    ]
  }
}
```

### Logging con ELK Stack

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*proxy-server*.log
      processors:
      - add_kubernetes_metadata:
          host: ${NODE_NAME}
          matchers:
          - logs_path:
              logs_path: "/var/log/containers/"
    
    output.elasticsearch:
      hosts: ["elasticsearch:9200"]
      index: "proxy-server-logs-%{+yyyy.MM.dd}"
    
    setup.template.name: "proxy-server"
    setup.template.pattern: "proxy-server-logs-*"
```

## Sicurezza

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: proxy-server-netpol
  namespace: proxy-system
spec:
  podSelector:
    matchLabels:
      app: proxy-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 4003
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: api-system
    ports:
    - protocol: TCP
      port: 4001
  - to:
    - namespaceSelector:
        matchLabels:
          name: docs-system
    ports:
    - protocol: TCP
      port: 4002
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### Pod Security Policy

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: proxy-server-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
```

## Backup e Disaster Recovery

### Backup Configuration

```bash
#!/bin/bash
# backup-proxy-config.sh

BACKUP_DIR="/backup/proxy-server/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup Kubernetes resources
kubectl get all,configmap,secret,ingress -n proxy-system -o yaml > $BACKUP_DIR/k8s-resources.yaml

# Backup logs
tar -czf $BACKUP_DIR/logs.tar.gz /var/log/proxy-server/

# Backup SSL certificates
cp -r /etc/ssl/proxy-server/ $BACKUP_DIR/ssl/

echo "Backup completed: $BACKUP_DIR"
```

### Disaster Recovery Plan

1. **Identificazione del problema**
   - Verificare health checks
   - Controllare logs
   - Verificare metriche

2. **Rollback rapido**
   ```bash
   kubectl rollout undo deployment/proxy-server -n proxy-system
   ```

3. **Restore da backup**
   ```bash
   kubectl apply -f backup/k8s-resources.yaml
   ```

4. **Verifica funzionalità**
   ```bash
   kubectl exec -it deployment/proxy-server -n proxy-system -- curl http://localhost:4003/health
   ```

## Performance Tuning

### Node.js Optimization

```bash
# Variabili d'ambiente per performance
export NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
export UV_THREADPOOL_SIZE=16
export NODE_ENV=production
```

### Kubernetes Resource Tuning

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Load Balancer Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-server-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800
```

## Troubleshooting

### Problemi Comuni

1. **Pod non si avvia**
   ```bash
   kubectl describe pod <pod-name> -n proxy-system
   kubectl logs <pod-name> -n proxy-system
   ```

2. **Health check fallisce**
   ```bash
   kubectl exec -it <pod-name> -n proxy-system -- curl -v http://localhost:4003/healthz
   ```

3. **Rate limiting troppo aggressivo**
   ```bash
   kubectl edit configmap proxy-config -n proxy-system
   ```

4. **Problemi di CORS**
   ```bash
   kubectl logs <pod-name> -n proxy-system | grep -i cors
   ```

### Debug Commands

```bash
# Verifica configurazione
kubectl exec -it deployment/proxy-server -n proxy-system -- env | grep -E "(PROXY|CORS|RATE)"

# Test connettività
kubectl exec -it deployment/proxy-server -n proxy-system -- nslookup api-server.api-system

# Verifica metriche
kubectl exec -it deployment/proxy-server -n proxy-system -- curl http://localhost:4003/metrics

# Debug logs
kubectl logs -f deployment/proxy-server -n proxy-system --tail=100
```

## Checklist Pre-Deployment

- [ ] Variabili d'ambiente configurate
- [ ] Certificati SSL validi
- [ ] Database accessibile
- [ ] Servizi backend raggiungibili
- [ ] Test di qualità passati
- [ ] Test E2E passati
- [ ] Monitoring configurato
- [ ] Backup strategy definita
- [ ] Disaster recovery plan testato
- [ ] Security scan completato
- [ ] Performance test eseguiti
- [ ] Documentation aggiornata

## Post-Deployment

- [ ] Health checks verificati
- [ ] Metriche monitorate
- [ ] Logs controllati
- [ ] Performance baseline stabilita
- [ ] Alerting configurato
- [ ] Team notificato
- [ ] Documentation deployment aggiornata