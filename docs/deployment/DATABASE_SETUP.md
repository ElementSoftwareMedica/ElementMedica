# 🗄️ Database Setup - ElementMedica 2.0

## Panoramica

Questa guida fornisce istruzioni dettagliate per configurare PostgreSQL in cloud per ElementMedica 2.0, con opzioni per AWS RDS e DigitalOcean Managed Database.

## 🎯 Opzioni Database Cloud

### Opzione 1: DigitalOcean Managed Database (CONSIGLIATA)

#### Vantaggi
- ✅ Costi più contenuti
- ✅ Interfaccia semplice e intuitiva
- ✅ Backup automatici inclusi
- ✅ Monitoraggio integrato
- ✅ Scaling verticale semplice
- ✅ Connessioni SSL automatiche

#### Configurazione DigitalOcean

**1. Creazione Database**
```bash
# Via DigitalOcean CLI (doctl)
doctl databases create elementmedica-prod \
  --engine postgres \
  --version 15 \
  --size db-s-1vcpu-1gb \
  --region fra1 \
  --num-nodes 1
```

**2. Configurazione Consigliata**
- **Engine**: PostgreSQL 15
- **Piano**: Basic (1 vCPU, 1GB RAM, 10GB SSD) - €15/mese
- **Regione**: Frankfurt (fra1) per latenza EU
- **Backup**: 7 giorni di retention
- **Maintenance Window**: Domenica 02:00-03:00 UTC

**3. Configurazioni Avanzate**
```sql
-- Configurazioni PostgreSQL ottimizzate
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### Opzione 2: AWS RDS

#### Vantaggi
- ✅ Scalabilità avanzata
- ✅ Integrazione AWS completa
- ✅ Performance Insights
- ✅ Multi-AZ per alta disponibilità
- ✅ Read replicas

#### Configurazione AWS RDS

**1. Creazione via AWS CLI**
```bash
# Creazione subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name elementmedica-subnet-group \
  --db-subnet-group-description "ElementMedica Database Subnet Group" \
  --subnet-ids subnet-12345678 subnet-87654321

# Creazione security group
aws ec2 create-security-group \
  --group-name elementmedica-db-sg \
  --description "ElementMedica Database Security Group"

# Regole security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-87654321

# Creazione database
aws rds create-db-instance \
  --db-instance-identifier elementmedica-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username elementmedica \
  --master-user-password 'YourSecurePassword123!' \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name elementmedica-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted \
  --deletion-protection
```

**2. Configurazione Consigliata**
- **Instance Class**: db.t3.micro (1 vCPU, 1GB RAM) - ~$13/mese
- **Storage**: 20GB GP2 SSD
- **Engine**: PostgreSQL 15.4
- **Multi-AZ**: No (per ridurre costi iniziali)
- **Backup**: 7 giorni
- **Encryption**: Abilitata

## 🔧 Setup Database ElementMedica

### 1. Creazione Database e Utente

```sql
-- Connessione come superuser
\c postgres

-- Creazione database
CREATE DATABASE elementmedica_prod
  WITH 
  ENCODING = 'UTF8'
  LC_COLLATE = 'en_US.UTF-8'
  LC_CTYPE = 'en_US.UTF-8'
  TEMPLATE = template0;

-- Creazione utente applicazione
CREATE USER elementmedica_app WITH
  PASSWORD 'ElementMedica2024!Secure'
  CREATEDB
  NOSUPERUSER
  NOCREATEROLE;

-- Assegnazione privilegi
GRANT ALL PRIVILEGES ON DATABASE elementmedica_prod TO elementmedica_app;

-- Connessione al database applicazione
\c elementmedica_prod

-- Creazione schema
CREATE SCHEMA IF NOT EXISTS elementmedica;
GRANT ALL ON SCHEMA elementmedica TO elementmedica_app;
GRANT ALL ON ALL TABLES IN SCHEMA elementmedica TO elementmedica_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA elementmedica TO elementmedica_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA elementmedica GRANT ALL ON TABLES TO elementmedica_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA elementmedica GRANT ALL ON SEQUENCES TO elementmedica_app;

-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Configurazione Connessione

**Variabili Ambiente (.env.production)**
```env
# Database Configuration
DATABASE_URL="postgresql://elementmedica_app:ElementMedica2024!Secure@your-db-host:5432/elementmedica_prod?schema=elementmedica&sslmode=require"
DATABASE_HOST="your-db-host"
DATABASE_PORT="5432"
DATABASE_NAME="elementmedica_prod"
DATABASE_USER="elementmedica_app"
DATABASE_PASSWORD="ElementMedica2024!Secure"
DATABASE_SCHEMA="elementmedica"
DATABASE_SSL="true"

# Connection Pool
DATABASE_POOL_MIN="2"
DATABASE_POOL_MAX="10"
DATABASE_POOL_IDLE_TIMEOUT="30000"
DATABASE_POOL_ACQUIRE_TIMEOUT="60000"
```

### 3. Test Connessione

```bash
# Test connessione diretta
psql "postgresql://elementmedica_app:ElementMedica2024!Secure@your-db-host:5432/elementmedica_prod?sslmode=require"

# Test via Node.js
node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err))
  .finally(() => client.end());
"
```

## 🚀 Migrazione e Deploy

### 1. Preparazione Prisma

```bash
# Generazione client Prisma
npx prisma generate

# Deploy schema (prima volta)
npx prisma db push

# O migrazione (se esistono migrazioni)
npx prisma migrate deploy

# Seed dati iniziali
npx prisma db seed
```

### 2. Script Migrazione Automatica

```bash
#!/bin/bash
# migrate-database.sh

set -e

echo "🚀 Starting database migration..."

# Backup database
echo "📦 Creating backup..."
pg_dump $DATABASE_URL > "backup_$(date +%Y%m%d_%H%M%S).sql"

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy

# Verify migration
echo "✅ Verifying migration..."
npx prisma db pull --print

echo "🎉 Migration completed successfully!"
```

## 🔒 Sicurezza Database

### 1. Configurazioni SSL

```bash
# Download certificati SSL (DigitalOcean)
wget https://raw.githubusercontent.com/digitalocean/do-managed-databases-ca-certificates/main/ca-certificate.crt

# Configurazione SSL in applicazione
export PGSSLMODE=require
export PGSSLCERT=./certs/client-cert.pem
export PGSSLKEY=./certs/client-key.pem
export PGSSLROOTCERT=./certs/ca-certificate.crt
```

### 2. Firewall e Accesso

```bash
# DigitalOcean - Configurazione Trusted Sources
# Via dashboard: Database > Settings > Trusted Sources
# Aggiungere IP server applicazione

# AWS RDS - Security Group Rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-database \
  --protocol tcp \
  --port 5432 \
  --source-group sg-application
```

### 3. Monitoring e Alerting

```yaml
# prometheus-postgres-exporter.yml
version: '3.8'
services:
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://monitoring_user:password@db-host:5432/elementmedica_prod?sslmode=require"
    ports:
      - "9187:9187"
    restart: unless-stopped
```

## 📊 Monitoraggio Database

### 1. Query Performance

```sql
-- Top 10 query più lente
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Connessioni attive
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity 
WHERE state = 'active';

-- Dimensione database
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'elementmedica'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Backup Automatico

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/var/backups/elementmedica"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/elementmedica_backup_$DATE.sql"

# Creazione directory backup
mkdir -p $BACKUP_DIR

# Backup completo
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compressione
gzip $BACKUP_FILE

# Cleanup backup vecchi (mantieni 7 giorni)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "✅ Backup completed: ${BACKUP_FILE}.gz"
```

## 🔧 Troubleshooting

### Problemi Comuni

**1. Connessione Rifiutata**
```bash
# Verifica firewall
telnet your-db-host 5432

# Verifica SSL
psql "postgresql://user:pass@host:5432/db?sslmode=require" -c "SELECT version();"
```

**2. Performance Lente**
```sql
-- Analisi query lente
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM your_table WHERE condition;

-- Verifica indici mancanti
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'elementmedica' 
AND n_distinct > 100;
```

**3. Spazio Disco**
```sql
-- Verifica spazio utilizzato
SELECT 
  pg_size_pretty(pg_database_size('elementmedica_prod')) as db_size,
  pg_size_pretty(pg_total_relation_size('elementmedica.person')) as person_table_size;

-- Vacuum e analyze
VACUUM ANALYZE;
```

## 📋 Checklist Setup

- [ ] **Database cloud creato** (DigitalOcean/AWS)
- [ ] **Utente applicazione configurato**
- [ ] **SSL abilitato e testato**
- [ ] **Firewall configurato**
- [ ] **Variabili ambiente impostate**
- [ ] **Connessione testata**
- [ ] **Schema Prisma deployato**
- [ ] **Dati seed inseriti**
- [ ] **Backup automatico configurato**
- [ ] **Monitoraggio attivato**
- [ ] **Performance baseline registrata**

## 🎯 Prossimi Passi

1. **Scegliere provider** (DigitalOcean consigliato per costi)
2. **Creare database** seguendo configurazioni sopra
3. **Configurare connessione** nell'applicazione
4. **Testare migrazione** con dati di sviluppo
5. **Configurare backup** e monitoraggio
6. **Documentare credenziali** in modo sicuro

---

**Nota**: Conservare sempre le credenziali database in un password manager sicuro e non commitarle mai nel repository.