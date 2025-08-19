# 🐳 Guida Completa alla Containerizzazione Docker

**Progetto 2.0 - Sistema di Gestione Documentale**  
**Data**: Gennaio 2025  
**Versione**: 1.0

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Prerequisiti](#prerequisiti)
3. [Architettura Docker](#architettura-docker)
4. [File di Configurazione](#file-di-configurazione)
5. [Build delle Immagini](#build-delle-immagini)
6. [Deployment](#deployment)
7. [Monitoraggio e Logs](#monitoraggio-e-logs)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## 🎯 Panoramica

Il progetto è completamente containerizzabile con Docker e supporta deployment multi-ambiente:

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Backend**: Node.js con 4 servizi separati
- **Database**: PostgreSQL 14+ + Redis
- **Proxy**: Nginx + Proxy Server personalizzato
- **Monitoraggio**: Prometheus + Grafana + Alertmanager

### ✅ Stato Containerizzazione

- ✅ **Dockerfile Frontend**: Multi-stage con Nginx
- ✅ **Dockerfile API Server**: Ottimizzato per produzione
- ✅ **Dockerfile Proxy Server**: Con health check avanzati
- ✅ **Dockerfile Documents Server**: Gestione upload sicura
- ✅ **Dockerfile Main Server**: Server principale
- ✅ **Docker Compose Staging**: Ambiente di test
- ✅ **Docker Compose Production**: Ambiente produzione
- ✅ **Script di Build**: Automatizzazione completa
- ✅ **Configurazioni Nginx**: Load balancing e SSL
- ✅ **Monitoraggio**: Stack completo Prometheus/Grafana

## 🔧 Prerequisiti

### Software Richiesto

```bash
# Docker Engine
docker --version  # >= 20.10.0

# Docker Compose
docker-compose --version  # >= 2.0.0

# Opzionale: Docker Buildx per build multi-platform
docker buildx version
```

### Risorse Sistema

| Ambiente | RAM | CPU | Disk |
|----------|-----|-----|------|
| Development | 4GB | 2 cores | 10GB |
| Staging | 8GB | 4 cores | 20GB |
| Production | 16GB | 8 cores | 50GB |

### Porte Utilizzate

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| Nginx | 80, 443 | Web server pubblico |
| Frontend | 5173 | Dev server (solo development) |
| Proxy Server | 4003 | Proxy interno |
| API Server | 4001 | API REST |
| Documents Server | 4002 | Gestione documenti |
| Main Server | 3001 | Server principale |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Prometheus | 9090 | Metriche |
| Grafana | 3000 | Dashboard |

## 🏗️ Architettura Docker

### Diagramma Architettura

```mermaid
graph TB
    subgraph "🌐 External"
        U[Users]
        LB[Load Balancer]
    end
    
    subgraph "🐳 Docker Network"
        subgraph "Frontend Tier"
            N[Nginx]
            F[Frontend Container]
        end
        
        subgraph "Application Tier"
            P[Proxy Server:4003]
            A[API Server:4001]
            D[Docs Server:4002]
            M[Main Server:3001]
        end
        
        subgraph "Data Tier"
            PG[(PostgreSQL:5432)]
            R[(Redis:6379)]
        end
        
        subgraph "Monitoring Tier"
            PR[Prometheus:9090]
            G[Grafana:3000]
            AM[Alertmanager]
        end
    end
    
    U --> LB
    LB --> N
    N --> F
    F --> P
    P --> A
    P --> D
    P --> M
    A --> PG
    A --> R
    D --> PG
    M --> PG
    M --> R
    
    PR --> A
    PR --> D
    PR --> M
    PR --> P
    G --> PR
    AM --> PR
```

### Volumi Docker

| Volume | Descrizione | Persistenza |
|--------|-------------|-------------|
| `postgres_data` | Dati PostgreSQL | ✅ Persistente |
| `redis_data` | Dati Redis | ✅ Persistente |
| `uploads` | File caricati | ✅ Persistente |
| `logs` | Log applicazioni | ✅ Persistente |
| `ssl` | Certificati SSL | ✅ Persistente |
| `prometheus_data` | Metriche Prometheus | ✅ Persistente |
| `grafana_data` | Dashboard Grafana | ✅ Persistente |

## 📁 File di Configurazione

### Dockerfile Creati

```
project/
├── Dockerfile.frontend          # Frontend React + Nginx
├── backend/
│   ├── Dockerfile.api          # API Server
│   ├── Dockerfile.proxy        # Proxy Server
│   ├── Dockerfile.docs         # Documents Server
│   ├── Dockerfile.main         # Main Server
│   └── .dockerignore           # Esclusioni backend
├── .dockerignore               # Esclusioni globali
└── scripts/
    └── docker-build.sh         # Script build automatico
```

### Docker Compose Files

```
project/
├── docker-compose.staging.yml      # Ambiente staging
├── docker-compose.production.yml   # Ambiente produzione
└── monitoring/
    ├── prometheus.yml              # Config Prometheus
    ├── grafana/                    # Dashboard Grafana
    └── alertmanager.yml           # Config alerting
```

### Variabili d'Ambiente

```bash
# File .env.staging
NODE_ENV=staging
STAGING_DATABASE_URL=postgresql://user:pass@postgres:5432/staging_db
STAGING_REDIS_URL=redis://redis:6379
STAGING_JWT_SECRET=your_staging_jwt_secret
STAGING_API_URL=https://staging-api.yourdomain.com
STAGING_DOCS_URL=https://staging-docs.yourdomain.com

# File .env.production
NODE_ENV=production
PROD_DATABASE_URL=postgresql://user:pass@postgres:5432/prod_db
PROD_REDIS_URL=redis://redis:6379
PROD_JWT_SECRET=your_production_jwt_secret
PROD_API_URL=https://api.yourdomain.com
PROD_DOCS_URL=https://docs.yourdomain.com
```

## 🔨 Build delle Immagini

### Build Automatico

```bash
# Build per staging
./scripts/docker-build.sh staging latest

# Build per produzione
./scripts/docker-build.sh production v1.0.0
```

### Build Manuale

```bash
# Frontend
docker build -f Dockerfile.frontend -t project-frontend:latest --target production .

# Backend Services
docker build -f backend/Dockerfile.api -t project-api:latest --target production backend/
docker build -f backend/Dockerfile.proxy -t project-proxy:latest --target production backend/
docker build -f backend/Dockerfile.docs -t project-docs:latest --target production backend/
docker build -f backend/Dockerfile.main -t project-main:latest --target production backend/
```

### Build Multi-Platform

```bash
# Setup buildx (una volta)
docker buildx create --name multiplatform --use

# Build per multiple architetture
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f Dockerfile.frontend \
  -t project-frontend:latest \
  --target production \
  --push .
```

## 🚀 Deployment

### Staging Deployment

```bash
# 1. Preparazione ambiente
cp .env.example .env.staging
# Modifica .env.staging con i valori corretti

# 2. Build e avvio
docker-compose -f docker-compose.staging.yml up -d

# 3. Verifica servizi
docker-compose -f docker-compose.staging.yml ps

# 4. Health check
curl http://localhost/health
curl http://localhost:4003/healthz
curl http://localhost:4001/health
```

### Production Deployment

```bash
# 1. Preparazione ambiente
cp .env.example .env.production
# Configura variabili di produzione

# 2. Build immagini
./scripts/docker-build.sh production v1.0.0

# 3. Deploy con zero-downtime
docker-compose -f docker-compose.production.yml up -d

# 4. Verifica deployment
./scripts/health-check.sh
```

### Blue-Green Deployment

```bash
# 1. Deploy ambiente green
./scripts/create-green-environment.sh

# 2. Test ambiente green
curl -H "Host: green.yourdomain.com" http://localhost/health

# 3. Switch traffico
./scripts/switch-to-green.sh

# 4. Cleanup ambiente blue
docker-compose -f docker-compose.production.yml --profile blue down
```

## 📊 Monitoraggio e Logs

### Logs Centralizzati

```bash
# Tutti i servizi
docker-compose -f docker-compose.production.yml logs -f

# Servizio specifico
docker-compose -f docker-compose.production.yml logs -f api

# Ultimi 100 log
docker-compose -f docker-compose.production.yml logs --tail=100 proxy

# Logs con timestamp
docker-compose -f docker-compose.production.yml logs -f -t
```

### Monitoraggio Prometheus

```bash
# Avvia stack monitoraggio
docker-compose -f docker-compose.production.yml --profile monitoring up -d

# Accesso Prometheus
open http://localhost:9090

# Accesso Grafana
open http://localhost:3000
# Default: admin/admin
```

### Metriche Chiave

| Metrica | Descrizione | Alert Threshold |
|---------|-------------|----------------|
| `http_requests_total` | Richieste HTTP totali | > 1000/min |
| `http_request_duration_seconds` | Latenza richieste | > 2s |
| `nodejs_heap_size_used_bytes` | Memoria heap Node.js | > 80% |
| `postgres_connections_active` | Connessioni DB attive | > 80% |
| `redis_connected_clients` | Client Redis connessi | > 100 |

## 🔧 Troubleshooting

### Problemi Comuni

#### 1. Container non si avvia

```bash
# Verifica logs
docker-compose logs [service_name]

# Verifica configurazione
docker-compose config

# Verifica risorse
docker system df
docker system prune
```

#### 2. Problemi di rete

```bash
# Verifica network
docker network ls
docker network inspect [network_name]

# Test connettività
docker exec [container] ping [target_container]
```

#### 3. Problemi di permessi

```bash
# Verifica ownership
docker exec [container] ls -la /app

# Fix permessi
docker exec [container] chown -R nodejs:nodejs /app
```

#### 4. Database non raggiungibile

```bash
# Verifica PostgreSQL
docker exec postgres_container pg_isready

# Test connessione
docker exec api_container psql $DATABASE_URL -c "SELECT 1;"
```

### Health Check Avanzati

```bash
# Script completo health check
#!/bin/bash
services=("frontend" "proxy" "api" "docs" "main" "postgres" "redis")

for service in "${services[@]}"; do
    echo "Checking $service..."
    if docker-compose ps $service | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is down"
        docker-compose logs --tail=20 $service
    fi
done
```

## 🎯 Best Practices

### Sicurezza

1. **Non-root Users**: Tutti i container usano utenti non-root
2. **Secrets Management**: Usa Docker secrets per dati sensibili
3. **Network Isolation**: Servizi isolati in reti separate
4. **SSL/TLS**: Certificati gestiti tramite volumi
5. **Firewall**: Solo porte necessarie esposte

### Performance

1. **Multi-stage Builds**: Immagini ottimizzate per produzione
2. **Layer Caching**: Ordine ottimale dei comandi Dockerfile
3. **Resource Limits**: Limiti memoria e CPU configurati
4. **Health Checks**: Monitoraggio continuo dello stato
5. **Log Rotation**: Gestione automatica dei log

### Manutenzione

1. **Backup Automatici**: Script per backup database e volumi
2. **Updates**: Processo controllato per aggiornamenti
3. **Monitoring**: Alert proattivi per problemi
4. **Documentation**: Documentazione sempre aggiornata
5. **Testing**: Test automatici pre-deployment

### Comandi Utili

```bash
# Pulizia sistema
docker system prune -a --volumes

# Backup volumi
docker run --rm -v project_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumi
docker run --rm -v project_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data

# Monitoring risorse
docker stats

# Inspect container
docker inspect [container_name]
```

## 📚 Riferimenti

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Nginx Docker Guide](https://hub.docker.com/_/nginx)
- [PostgreSQL Docker Guide](https://hub.docker.com/_/postgres)

---

**✅ CONCLUSIONE**: Il progetto è completamente containerizzabile e pronto per deployment Docker in qualsiasi ambiente. Tutti i Dockerfile, configurazioni e script necessari sono stati creati e testati.

**🚀 PROSSIMI PASSI**:
1. Configurare le variabili d'ambiente per il tuo ambiente
2. Eseguire il build con `./scripts/docker-build.sh`
3. Avviare i servizi con `docker-compose up -d`
4. Verificare il funzionamento con gli health check
5. Configurare il monitoraggio e gli alert