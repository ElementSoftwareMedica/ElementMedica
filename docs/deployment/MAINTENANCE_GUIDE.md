# 🔧 Maintenance Guide - ElementMedica 2.0

## Panoramica

Questa guida fornisce tutte le procedure necessarie per la manutenzione quotidiana, settimanale e mensile di ElementMedica 2.0 in produzione.

## 📅 Calendario Manutenzione

### Giornaliero (Automatico)
- ✅ **Backup database** (02:00 UTC)
- ✅ **Log rotation** (03:00 UTC)
- ✅ **Health checks** (ogni 15 minuti)
- ✅ **Security scans** (04:00 UTC)
- ✅ **Performance monitoring** (continuo)

### Settimanale (Manuale)
- 🔍 **Review log errori**
- 📊 **Analisi performance**
- 🔒 **Security audit**
- 💾 **Verifica backup**
- 🧹 **Cleanup file temporanei**

### Mensile (Manuale)
- 🔄 **Update sistema operativo**
- 🐳 **Update immagini Docker**
- 🔐 **Rotazione chiavi**
- 📈 **Report performance**
- 🧪 **Test disaster recovery**

## 🔍 Monitoring Quotidiano

### 1. Dashboard Grafana

```bash
# Accesso Grafana
echo "Grafana URL: https://your-domain.com:3000"
echo "Username: admin"
echo "Password: [check docker logs]"

# Metriche da controllare:
# - CPU Usage < 80%
# - Memory Usage < 85%
# - Disk Usage < 90%
# - Response Time < 500ms
# - Error Rate < 1%
# - Database Connections < 80% max
```

### 2. Health Check Script

```bash
#!/bin/bash
# daily-health-check.sh

LOG_FILE="/var/log/elementmedica-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

log "🔍 Starting daily health check..."

# Test servizi principali
services=("nginx" "docker" "fail2ban")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        log "✅ $service is running"
    else
        log "❌ $service is not running"
        systemctl restart $service
        log "🔄 Restarted $service"
    fi
done

# Test container Docker
cd /opt/elementmedica/app
containers=$(docker compose -f docker-compose.production.yml ps --services)
for container in $containers; do
    if docker compose -f docker-compose.production.yml ps $container | grep -q "Up"; then
        log "✅ Container $container is running"
    else
        log "❌ Container $container is not running"
        docker compose -f docker-compose.production.yml restart $container
        log "🔄 Restarted container $container"
    fi
done

# Test endpoint critici
endpoints=(
    "https://your-domain.com/health"
    "https://your-domain.com/api/health"
    "http://localhost:4001/health"
    "http://localhost:4003/health"
)

for endpoint in "${endpoints[@]}"; do
    if curl -f -s $endpoint > /dev/null; then
        log "✅ $endpoint is responding"
    else
        log "❌ $endpoint is not responding"
    fi
done

# Test database
if docker compose -f docker-compose.production.yml exec -T postgres pg_isready -U elementmedica_app > /dev/null; then
    log "✅ Database is responding"
else
    log "❌ Database is not responding"
fi

# Test spazio disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    log "✅ Disk usage: ${DISK_USAGE}%"
else
    log "⚠️ Disk usage high: ${DISK_USAGE}%"
fi

# Test memoria
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -lt 85 ]; then
    log "✅ Memory usage: ${MEM_USAGE}%"
else
    log "⚠️ Memory usage high: ${MEM_USAGE}%"
fi

log "✅ Daily health check completed"
```

### 3. Cron Job Setup

```bash
# Installazione script
sudo cp daily-health-check.sh /opt/elementmedica/
sudo chmod +x /opt/elementmedica/daily-health-check.sh

# Aggiunta cron job
echo "0 8 * * * /opt/elementmedica/daily-health-check.sh" | crontab -

# Verifica cron
crontab -l
```

## 📊 Analisi Performance

### 1. Database Performance

```sql
-- Query più lente
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Dimensioni tabelle
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'elementmedica'
ORDER BY size_bytes DESC;

-- Connessioni attive
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;

-- Lock attivi
SELECT 
    locktype,
    mode,
    granted,
    count(*)
FROM pg_locks 
GROUP BY locktype, mode, granted
ORDER BY count DESC;
```

### 2. Application Performance

```bash
# Metriche container
docker stats --no-stream

# Log errori recenti
docker compose -f docker-compose.production.yml logs --since="24h" | grep -i error

# Response time API
for i in {1..10}; do
    curl -w "%{time_total}\n" -o /dev/null -s https://your-domain.com/api/health
done | awk '{sum+=$1; count++} END {print "Average response time:", sum/count, "seconds"}'

# Memory usage per container
docker compose -f docker-compose.production.yml exec backend ps aux --sort=-%mem | head -10
```

### 3. System Performance

```bash
# CPU e Load Average
uptime
top -bn1 | grep "Cpu(s)"

# I/O Statistics
iostat -x 1 5

# Network Statistics
ss -tuln
netstat -i

# Disk I/O
iotop -ao
```

## 🔒 Security Maintenance

### 1. Security Audit Script

```bash
#!/bin/bash
# security-audit.sh

LOG_FILE="/var/log/elementmedica-security.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

log "🔒 Starting security audit..."

# Verifica aggiornamenti sicurezza
log "📦 Checking security updates..."
sudo apt list --upgradable 2>/dev/null | grep -i security

# Verifica fail2ban
log "🛡️ Checking fail2ban status..."
sudo fail2ban-client status
sudo fail2ban-client status sshd

# Verifica certificati SSL
log "🔐 Checking SSL certificates..."
SSL_EXPIRY=$(echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    log "⚠️ SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
else
    log "✅ SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
fi

# Verifica login sospetti
log "👤 Checking suspicious logins..."
sudo grep "Failed password" /var/log/auth.log | tail -10

# Verifica porte aperte
log "🔌 Checking open ports..."
sudo netstat -tlnp | grep LISTEN

# Verifica processi sospetti
log "⚙️ Checking running processes..."
ps aux --sort=-%cpu | head -10

# Verifica file modificati recentemente
log "📁 Checking recently modified files..."
find /opt/elementmedica -type f -mtime -1 -ls

log "✅ Security audit completed"
```

### 2. Hardening Checklist

```bash
# Verifica configurazione SSH
sudo sshd -T | grep -E "(PasswordAuthentication|PermitRootLogin|Protocol)"

# Verifica firewall
sudo ufw status verbose

# Verifica utenti sistema
cut -d: -f1 /etc/passwd | sort

# Verifica sudo access
sudo grep -E "^(root|sudo)" /etc/group

# Verifica cron jobs
sudo crontab -l
crontab -l

# Verifica servizi attivi
systemctl list-units --type=service --state=active
```

## 💾 Backup e Recovery

### 1. Verifica Backup

```bash
#!/bin/bash
# verify-backups.sh

BACKUP_DIR="/opt/elementmedica/backups"
LOG_FILE="/var/log/elementmedica-backup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a $LOG_FILE
}

log "💾 Starting backup verification..."

# Verifica backup recenti
LATEST_DB_BACKUP=$(ls -t $BACKUP_DIR/db_backup_*.sql 2>/dev/null | head -1)
LATEST_FILES_BACKUP=$(ls -t $BACKUP_DIR/uploads_backup_*.tar.gz 2>/dev/null | head -1)

if [ -n "$LATEST_DB_BACKUP" ]; then
    BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_DB_BACKUP")) / 3600 ))
    if [ $BACKUP_AGE -lt 25 ]; then
        log "✅ Database backup is recent (${BACKUP_AGE}h old)"
    else
        log "⚠️ Database backup is old (${BACKUP_AGE}h old)"
    fi
    
    # Test integrità backup
    if pg_restore --list "$LATEST_DB_BACKUP" > /dev/null 2>&1; then
        log "✅ Database backup integrity OK"
    else
        log "❌ Database backup integrity FAILED"
    fi
else
    log "❌ No database backup found"
fi

if [ -n "$LATEST_FILES_BACKUP" ]; then
    BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_FILES_BACKUP")) / 3600 ))
    if [ $BACKUP_AGE -lt 25 ]; then
        log "✅ Files backup is recent (${BACKUP_AGE}h old)"
    else
        log "⚠️ Files backup is old (${BACKUP_AGE}h old)"
    fi
    
    # Test integrità backup
    if tar -tzf "$LATEST_FILES_BACKUP" > /dev/null 2>&1; then
        log "✅ Files backup integrity OK"
    else
        log "❌ Files backup integrity FAILED"
    fi
else
    log "❌ No files backup found"
fi

# Verifica spazio backup
BACKUP_USAGE=$(du -sh $BACKUP_DIR | cut -f1)
log "📊 Backup directory usage: $BACKUP_USAGE"

log "✅ Backup verification completed"
```

### 2. Test Recovery

```bash
#!/bin/bash
# test-recovery.sh

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🧪 Starting recovery test..."

# Creazione database test
TEST_DB="elementmedica_test_$(date +%s)"
log "📝 Creating test database: $TEST_DB"

docker compose -f docker-compose.production.yml exec -T postgres createdb -U elementmedica_app $TEST_DB

# Restore backup più recente
LATEST_BACKUP=$(ls -t /opt/elementmedica/backups/db_backup_*.sql | head -1)
log "📥 Restoring backup: $LATEST_BACKUP"

if docker compose -f docker-compose.production.yml exec -T postgres psql -U elementmedica_app -d $TEST_DB < "$LATEST_BACKUP"; then
    log "✅ Backup restore successful"
    
    # Test query su database ripristinato
    PERSON_COUNT=$(docker compose -f docker-compose.production.yml exec -T postgres psql -U elementmedica_app -d $TEST_DB -t -c "SELECT COUNT(*) FROM elementmedica.person;" | tr -d ' \n')
    log "📊 Restored database contains $PERSON_COUNT persons"
    
    # Cleanup database test
    docker compose -f docker-compose.production.yml exec -T postgres dropdb -U elementmedica_app $TEST_DB
    log "🧹 Test database cleaned up"
else
    log "❌ Backup restore failed"
    docker compose -f docker-compose.production.yml exec -T postgres dropdb -U elementmedica_app $TEST_DB 2>/dev/null
fi

log "✅ Recovery test completed"
```

## 🔄 Update Procedures

### 1. System Updates

```bash
#!/bin/bash
# system-update.sh

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🔄 Starting system update..."

# Backup prima dell'update
log "💾 Creating pre-update backup..."
/opt/elementmedica/backup.sh

# Update sistema
log "📦 Updating system packages..."
sudo apt update
sudo apt list --upgradable

# Update solo security patches
sudo unattended-upgrade -d

# Verifica servizi dopo update
log "🔍 Checking services after update..."
sudo systemctl status nginx docker fail2ban

# Test applicazione
log "🧪 Testing application..."
if curl -f https://your-domain.com/health > /dev/null 2>&1; then
    log "✅ Application is responding"
else
    log "❌ Application is not responding"
fi

log "✅ System update completed"
```

### 2. Application Updates

```bash
#!/bin/bash
# app-update.sh

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

cd /opt/elementmedica/app

log "🚀 Starting application update..."

# Backup pre-update
log "💾 Creating backup..."
/opt/elementmedica/backup.sh

# Backup configurazione corrente
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)

# Pull latest changes
log "📥 Pulling latest changes..."
git fetch origin
git checkout production
git pull origin production

# Build nuove immagini
log "🔨 Building new images..."
docker compose -f docker-compose.production.yml build --no-cache

# Rolling update
log "🔄 Performing rolling update..."
docker compose -f docker-compose.production.yml up -d

# Attesa stabilizzazione
log "⏳ Waiting for services to stabilize..."
sleep 60

# Health check
log "🔍 Performing health check..."
if curl -f https://your-domain.com/health > /dev/null 2>&1; then
    log "✅ Update successful"
    
    # Cleanup immagini vecchie
    docker image prune -f
    log "🧹 Cleaned up old images"
else
    log "❌ Health check failed, rolling back..."
    
    # Rollback
    git reset --hard HEAD~1
    docker compose -f docker-compose.production.yml build
    docker compose -f docker-compose.production.yml up -d
    
    log "🔙 Rollback completed"
    exit 1
fi

log "✅ Application update completed"
```

## 📈 Performance Optimization

### 1. Database Optimization

```sql
-- Vacuum e analyze settimanale
VACUUM ANALYZE;

-- Reindex se necessario
REINDEX DATABASE elementmedica_prod;

-- Update statistiche
ANALYZE;

-- Verifica indici inutilizzati
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Verifica tabelle che necessitano vacuum
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::numeric / (n_live_tup + n_dead_tup) * 100, 2) as dead_percentage
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;
```

### 2. Application Optimization

```bash
# Cleanup log vecchi
find /opt/elementmedica/logs -name "*.log" -mtime +30 -delete

# Cleanup upload temporanei
find /opt/elementmedica/data/uploads/temp -mtime +1 -delete

# Ottimizzazione Redis
docker compose -f docker-compose.production.yml exec redis redis-cli FLUSHDB
docker compose -f docker-compose.production.yml exec redis redis-cli CONFIG SET save "900 1 300 10 60 10000"

# Restart servizi per liberare memoria
docker compose -f docker-compose.production.yml restart backend frontend
```

## 📋 Checklist Manutenzione

### Giornaliera
- [ ] **Health check** automatico eseguito
- [ ] **Backup** database completato
- [ ] **Log** controllati per errori
- [ ] **Metriche** Grafana verificate
- [ ] **Spazio disco** sotto 90%
- [ ] **Memoria** sotto 85%
- [ ] **CPU** sotto 80%

### Settimanale
- [ ] **Security audit** eseguito
- [ ] **Backup recovery** testato
- [ ] **Performance** analizzata
- [ ] **Log errori** revisionati
- [ ] **Certificati SSL** verificati
- [ ] **Database vacuum** eseguito
- [ ] **Cleanup file** temporanei

### Mensile
- [ ] **System updates** applicati
- [ ] **Docker images** aggiornate
- [ ] **Security patches** installate
- [ ] **Performance report** generato
- [ ] **Disaster recovery** testato
- [ ] **Backup strategy** rivista
- [ ] **Monitoring alerts** verificati

## 🚨 Emergency Procedures

### 1. Server Down

```bash
# Verifica status servizi
sudo systemctl status nginx docker

# Restart servizi critici
sudo systemctl restart nginx
sudo systemctl restart docker

# Verifica log errori
sudo journalctl -u nginx -f
sudo journalctl -u docker -f

# Restart applicazione
cd /opt/elementmedica/app
docker compose -f docker-compose.production.yml restart
```

### 2. Database Issues

```bash
# Verifica connessione database
docker compose -f docker-compose.production.yml exec postgres pg_isready

# Verifica log database
docker compose -f docker-compose.production.yml logs postgres

# Restart database container
docker compose -f docker-compose.production.yml restart postgres

# Recovery da backup se necessario
psql "$DATABASE_URL" < /opt/elementmedica/backups/latest_backup.sql
```

### 3. SSL Certificate Issues

```bash
# Verifica certificato
sudo certbot certificates

# Rinnovo manuale
sudo certbot renew --force-renewal

# Restart Nginx
sudo systemctl restart nginx

# Test SSL
curl -I https://your-domain.com
```

## 📞 Contatti Support

### Team Contacts
- **System Administrator**: admin@your-domain.com
- **Database Administrator**: dba@your-domain.com
- **Security Officer**: security@your-domain.com
- **DevOps Engineer**: devops@your-domain.com

### External Support
- **Hosting Provider**: [Provider Support]
- **DNS Provider**: [DNS Support]
- **SSL Provider**: Let's Encrypt Community
- **Monitoring**: Grafana Community

---

**📚 Questa guida deve essere aggiornata regolarmente e condivisa con tutto il team operativo.**