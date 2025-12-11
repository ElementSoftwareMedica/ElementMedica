# Deployment Guide - Preventivi e Codici Sconto

## 📋 Panoramica

Questa guida fornisce istruzioni complete per il deployment del modulo **Preventivi e Codici Sconto** su ambiente di produzione (Hetzner) e staging.

## 🎯 Prerequisiti

### Sistema Operativo
- **OS**: Ubuntu 22.04 LTS o superiore
- **RAM**: Minimo 4GB, raccomandato 8GB
- **Storage**: Minimo 20GB disponibili
- **CPU**: 2+ cores

### Software Richiesto
- **Node.js**: v18.x o v20.x LTS
- **PostgreSQL**: v14.x o v15.x
- **Nginx**: v1.18+ (proxy reverse)
- **PM2**: v5.x (process manager)
- **Git**: v2.x

### Accessi Necessari
- [x] SSH al server (chiave privata)
- [x] Accesso database PostgreSQL
- [x] Credenziali SMTP (invio email)
- [x] Repository Git (read access)

---

## 🚀 Quick Start Deployment

### 1. Preparazione Server

```bash
# Connetti al server
ssh ubuntu@your-server-ip

# Aggiorna sistema
sudo apt update && sudo apt upgrade -y

# Installa dipendenze
sudo apt install -y curl git build-essential postgresql-client nginx

# Installa Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installa PM2 globalmente
sudo npm install -g pm2

# Verifica installazioni
node --version   # v20.x.x
npm --version    # 10.x.x
psql --version   # 14.x o 15.x
```

### 2. Clone Repository

```bash
# Crea directory app
sudo mkdir -p /var/www/elementmedica
sudo chown $USER:$USER /var/www/elementmedica
cd /var/www/elementmedica

# Clone repo (production branch)
git clone https://github.com/your-org/elementmedica.git .
git checkout production

# Installa dipendenze backend
cd backend
npm ci --production

# Installa dipendenze frontend
cd ../
npm ci --production
```

### 3. Configurazione Environment Variables

```bash
# Backend .env
cd /var/www/elementmedica/backend
nano .env
```

Copia e configura:

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/elementmedica_prod?schema=public"

# ============================================
# JWT
# ============================================
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# ============================================
# API SERVER
# ============================================
NODE_ENV="production"
API_PORT=4001
API_HOST="0.0.0.0"

# ============================================
# FRONTEND URL (CORS)
# ============================================
FRONTEND_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# ============================================
# SMTP (Email)
# ============================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="ElementMedica <noreply@yourdomain.com>"

# ============================================
# FILE UPLOADS
# ============================================
UPLOAD_DIR="/var/www/elementmedica/backend/uploads"
MAX_FILE_SIZE=10485760  # 10MB

# ============================================
# PDF GENERATION
# ============================================
PDF_ENGINE="puppeteer"
PDF_TEMP_DIR="/tmp/elementmedica-pdf"

# ============================================
# LOGGING
# ============================================
LOG_LEVEL="info"
LOG_FILE="/var/www/elementmedica/logs/api.log"

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=60000  # 1 minuto
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# TENANT (Multi-tenancy)
# ============================================
DEFAULT_TENANT_ID="your-default-tenant-uuid"
```

**Frontend .env**:

```bash
cd /var/www/elementmedica
nano .env.production
```

```env
VITE_API_URL=https://yourdomain.com/api
VITE_APP_NAME="ElementMedica"
VITE_APP_VERSION="2.0.0"
```

### 4. Database Setup

```bash
# Crea database (se non esiste)
sudo -u postgres psql -c "CREATE DATABASE elementmedica_prod;"
sudo -u postgres psql -c "CREATE USER elementmedica WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE elementmedica_prod TO elementmedica;"

# Run migrations
cd /var/www/elementmedica/backend
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# (Opzionale) Seed dati iniziali
npm run seed:production
```

### 5. Carica Template Preventivo

**Opzione A: Via SQL**

```bash
cd /var/www/elementmedica/backend/database
psql $DATABASE_URL -f templates/preventivo_template.sql
```

**Opzione B: Via Admin UI** (dopo deployment)

1. Login come admin
2. Vai su **Impostazioni** > **Template**
3. Clicca **[+ Carica Template]**
4. Seleziona tipo: `preventivo`
5. Upload file HTML template
6. Salva

### 6. Build Frontend

```bash
cd /var/www/elementmedica
npm run build

# Output in: dist/
# Verifica build
ls -lh dist/
```

### 7. Configurazione Nginx

```bash
sudo nano /etc/nginx/sites-available/elementmedica
```

```nginx
# ElementMedica Production Config
upstream api_backend {
    server 127.0.0.1:4001;
    keepalive 64;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Logs
    access_log /var/log/nginx/elementmedica-access.log;
    error_log /var/log/nginx/elementmedica-error.log warn;

    # Frontend (SPA)
    root /var/www/elementmedica/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://api_backend/api/;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # PDF Downloads
    location /uploads/ {
        alias /var/www/elementmedica/backend/uploads/;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Attiva configurazione**:

```bash
# Symlink
sudo ln -s /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/

# Test configurazione
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 8. Setup SSL (Let's Encrypt)

```bash
# Installa Certbot
sudo apt install -y certbot python3-certbot-nginx

# Ottieni certificato
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verifica auto-renewal
sudo certbot renew --dry-run

# Certificato si rinnova automaticamente
```

### 9. Avvio Backend con PM2

```bash
cd /var/www/elementmedica/backend

# Crea ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'elementmedica-api',
      script: './servers/main-server.js',
      instances: 2,  // Cluster mode (2x CPU cores)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4001
      },
      error_file: '/var/www/elementmedica/logs/pm2-error.log',
      out_file: '/var/www/elementmedica/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

**Start applicazione**:

```bash
# Start con PM2
pm2 start ecosystem.config.js --env production

# Salva configurazione per auto-restart
pm2 save

# Setup PM2 startup script
pm2 startup
# Esegui il comando suggerito (con sudo)

# Verifica status
pm2 status
pm2 logs elementmedica-api --lines 50
```

### 10. Verifica Deployment

**Health Check**:

```bash
# API Health
curl https://yourdomain.com/health

# Expected:
{
  "status": "ok",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}

# Frontend
curl -I https://yourdomain.com

# Expected: HTTP/2 200
```

**Test API**:

```bash
# Login
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Lista codici sconto
curl https://yourdomain.com/api/codici-sconto \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Test Frontend**:
- Naviga a `https://yourdomain.com`
- Login con credenziali admin
- Verifica moduli Codici Sconto e Preventivi

---

## 🔧 Configurazioni Avanzate

### Multi-Tenant Setup

Se gestisci più tenant:

```sql
-- Crea tenant aggiuntivi
INSERT INTO tenants (id, name, domain, settings, createdAt, updatedAt)
VALUES 
  (gen_random_uuid(), 'Tenant A', 'tenant-a.com', '{}', NOW(), NOW()),
  (gen_random_uuid(), 'Tenant B', 'tenant-b.com', '{}', NOW(), NOW());

-- Assegna utenti a tenant
UPDATE persons 
SET tenantId = (SELECT id FROM tenants WHERE name = 'Tenant A')
WHERE email LIKE '%@tenant-a.com';
```

### Database Backup Automatico

```bash
# Crea script backup
sudo nano /usr/local/bin/backup-elementmedica.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/elementmedica"
DB_NAME="elementmedica_prod"
DB_USER="elementmedica"

mkdir -p $BACKUP_DIR

# Database dump
PGPASSWORD="your-password" pg_dump \
  -U $DB_USER \
  -h localhost \
  -F c \
  -b \
  -v \
  -f "$BACKUP_DIR/db_$DATE.dump" \
  $DB_NAME

# Uploads backup
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" \
  /var/www/elementmedica/backend/uploads

# Mantieni solo ultimi 7 giorni
find $BACKUP_DIR -name "db_*.dump" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Rendi eseguibile e aggiungi a cron**:

```bash
sudo chmod +x /usr/local/bin/backup-elementmedica.sh

# Crontab (ogni giorno alle 2 AM)
sudo crontab -e
```

```cron
0 2 * * * /usr/local/bin/backup-elementmedica.sh >> /var/log/elementmedica-backup.log 2>&1
```

### Log Rotation

```bash
sudo nano /etc/logrotate.d/elementmedica
```

```conf
/var/www/elementmedica/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Monitoring con PM2 Plus (Opzionale)

```bash
# Link a PM2 Plus
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY

# Dashboard: https://app.pm2.io
```

### Firewall (UFW)

```bash
# Abilita firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verifica regole
sudo ufw status
```

---

## 📊 Monitoring e Troubleshooting

### Check Logs

```bash
# PM2 logs
pm2 logs elementmedica-api --lines 100
pm2 logs elementmedica-api --err  # Solo errori

# Nginx access log
sudo tail -f /var/log/nginx/elementmedica-access.log

# Nginx error log
sudo tail -f /var/log/nginx/elementmedica-error.log

# System logs
sudo journalctl -u nginx -f
```

### Performance Monitoring

```bash
# CPU/RAM usage
pm2 monit

# Dettagli processo
pm2 show elementmedica-api

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### Common Issues

#### ❌ "502 Bad Gateway"

**Causa**: Backend non risponde

**Debug**:
```bash
# Verifica backend running
pm2 status

# Check errori
pm2 logs elementmedica-api --err --lines 50

# Restart
pm2 restart elementmedica-api
```

#### ❌ "Database connection failed"

**Causa**: PostgreSQL down o credenziali errate

**Debug**:
```bash
# Test connessione
psql $DATABASE_URL -c "SELECT 1;"

# Verifica PostgreSQL running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### ❌ "CORS error" dal frontend

**Causa**: `ALLOWED_ORIGINS` non include dominio frontend

**Fix**:
```bash
# Backend .env
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# Restart backend
pm2 restart elementmedica-api
```

#### ❌ "Template PDF non trovato"

**Causa**: Template non caricato in database

**Fix**:
```sql
-- Verifica template
SELECT id, type, name FROM templates WHERE type = 'preventivo';

-- Se mancante, carica:
psql $DATABASE_URL -f backend/database/templates/preventivo_template.sql
```

---

## 🔄 Update e Rollback

### Deploy Nuova Versione

```bash
cd /var/www/elementmedica

# Pull nuova versione
git fetch origin
git checkout production
git pull origin production

# Backend: Installa nuove dipendenze
cd backend
npm ci --production

# Run nuove migrations
npx prisma migrate deploy
npx prisma generate

# Frontend: Rebuild
cd ..
npm ci --production
npm run build

# Restart backend (zero-downtime con cluster)
pm2 reload elementmedica-api

# Verifica
pm2 logs elementmedica-api --lines 20
curl https://yourdomain.com/health
```

### Rollback a Versione Precedente

```bash
cd /var/www/elementmedica

# Vedi commit history
git log --oneline -10

# Rollback a commit specifico
git checkout COMMIT_HASH

# Rebuild
cd backend && npm ci --production
cd .. && npm run build

# Rollback database (PERICOLOSO)
# Usa backup o migrazione inversa Prisma
npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Restart
pm2 reload elementmedica-api
```

**⚠️ Nota**: Rollback database può causare perdita dati. Usa con cautela.

---

## 🔐 Security Checklist

### Pre-Deployment

- [ ] **JWT_SECRET** cambiato da default
- [ ] **Database password** strong (16+ chars, mix)
- [ ] **SMTP credentials** sicure
- [ ] **.env files** NON committati su Git
- [ ] **SSH key-only** (password login disabilitato)
- [ ] **Firewall** attivo (UFW)
- [ ] **SSL/TLS** configurato (Let's Encrypt)
- [ ] **Security headers** in Nginx
- [ ] **Rate limiting** abilitato
- [ ] **CORS origins** restrittivi

### Post-Deployment

- [ ] **Backup automatici** configurati
- [ ] **Log rotation** attivo
- [ ] **Monitoring** setup (PM2 Plus o Grafana)
- [ ] **Health checks** schedulati
- [ ] **Vulnerability scanning** (npm audit)
- [ ] **Penetration testing** (opzionale)

### Audit Regolari

```bash
# NPM vulnerabilities
npm audit

# Fix automatico (minori)
npm audit fix

# Check dipendenze outdated
npm outdated

# Update con cautela
npm update
```

---

## 📈 Performance Optimization

### Database Indexing

```sql
-- Indexes per performance query comuni
CREATE INDEX IF NOT EXISTS idx_codici_sconto_attivo 
ON codici_sconto(attivo, dataFine) 
WHERE deletedAt IS NULL;

CREATE INDEX IF NOT EXISTS idx_codici_sconto_codice 
ON codici_sconto(codice) 
WHERE deletedAt IS NULL;

CREATE INDEX IF NOT EXISTS idx_preventivi_stato 
ON preventivi(stato, dataEmissione DESC) 
WHERE deletedAt IS NULL;

CREATE INDEX IF NOT EXISTS idx_preventivi_azienda 
ON preventivi(aziendaId) 
WHERE deletedAt IS NULL;

CREATE INDEX IF NOT EXISTS idx_preventivi_numero 
ON preventivi(numero) 
WHERE deletedAt IS NULL;

-- Vacuum e analyze
VACUUM ANALYZE;
```

### Nginx Caching (Opzionale)

```nginx
# Aggiungi a server block
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m use_temp_path=off;

location /api/codici-sconto {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
    
    proxy_pass http://api_backend;
}
```

### PM2 Cluster Mode

Già configurato sopra con `instances: 2`. Aumenta per più CPU:

```javascript
// ecosystem.config.js
instances: 4,  // O 'max' per auto-detect CPU count
```

---

## 🧪 Testing Post-Deployment

### Test Suite Completo

```bash
# Backend Integration Tests
cd backend
npm run test:integration

# Frontend E2E Tests (Playwright)
cd ..
npm run test:e2e:production
```

### Smoke Tests Manuali

**Checklist**:

1. **Login/Auth**:
   - [ ] Login admin funziona
   - [ ] JWT token generato
   - [ ] Session persiste

2. **Codici Sconto**:
   - [ ] Lista codici carica
   - [ ] Crea nuovo codice
   - [ ] Modifica codice esistente
   - [ ] Elimina codice (soft delete)
   - [ ] Filtri funzionano (stato, tipo)

3. **Preventivi**:
   - [ ] Lista preventivi carica
   - [ ] Crea nuovo preventivo
   - [ ] Applica codice sconto
   - [ ] Genera PDF (download ok)
   - [ ] Cambio stato (BOZZA → INVIATO → ACCETTATO)

4. **RBAC**:
   - [ ] Admin vede tutto
   - [ ] Commerciale vede solo sue operations
   - [ ] Permessi negati loggano audit

5. **Multi-Tenancy**:
   - [ ] User Tenant A non vede dati Tenant B
   - [ ] Codici sconto isolati per tenant
   - [ ] Preventivi isolati per tenant

---

## 📚 Checklist Deployment

### Pre-Deployment
- [ ] Codice testato in staging
- [ ] Migrations testate su DB copia
- [ ] Backup database pre-deploy
- [ ] Environment variables configurate
- [ ] SSL certificati validi
- [ ] DNS configurato correttamente

### Durante Deployment
- [ ] Git pull su branch corretto
- [ ] npm ci --production (NO npm install)
- [ ] Prisma migrate deploy (NO dev)
- [ ] Frontend build ottimizzato
- [ ] Nginx config testato (nginx -t)
- [ ] PM2 restart senza downtime

### Post-Deployment
- [ ] Health check OK
- [ ] Login funzionante
- [ ] API endpoint testati
- [ ] PDF generation funziona
- [ ] Email invio testato
- [ ] Logs senza errori critici
- [ ] Performance acceptable (<500ms API)
- [ ] Backup automatici verificati

---

## 🔗 Risorse Utili

### Documentazione
- [API Reference](../technical/api/README.md)
- [User Guide Codici Sconto](../user/CODICI_SCONTO_GUIDE.md)
- [User Guide Preventivi](../user/PREVENTIVI_GUIDE.md)
- [Testing Report](../testing/FASE_6_TESTING_REPORT.md)

### Tools
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Let's Encrypt](https://letsencrypt.org/docs/)

### Monitoring
- PM2 Plus: https://app.pm2.io
- UptimeRobot: https://uptimerobot.com
- Sentry (Error Tracking): https://sentry.io

---

## 📞 Support

### Deployment Issues
- **Email**: devops@elementmedica.it
- **Slack**: #deployment-support
- **Emergency**: +39 XXX XXX XXXX

### Post-Deployment
- **Monitoring**: https://status.elementmedica.it
- **Logs Dashboard**: https://logs.elementmedica.it
- **Documentation**: https://docs.elementmedica.it

---

**Versione Guida**: 1.0.0  
**Ultimo Aggiornamento**: 9 Novembre 2025  
**Autori**: ElementMedica DevOps Team  
**Stato**: ✅ Validato su Hetzner Ubuntu 22.04

---

## Appendice A: Environment Variables Reference

| Variabile | Tipo | Obbligatorio | Default | Descrizione |
|-----------|------|--------------|---------|-------------|
| `DATABASE_URL` | string | ✅ | - | PostgreSQL connection string |
| `JWT_SECRET` | string | ✅ | - | Secret per firma JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | string | ❌ | "7d" | Durata token JWT |
| `NODE_ENV` | enum | ✅ | - | `development` \| `production` \| `test` |
| `API_PORT` | number | ❌ | 4001 | Porta backend API |
| `FRONTEND_URL` | string | ✅ | - | URL frontend per CORS |
| `SMTP_HOST` | string | ✅ | - | Server SMTP |
| `SMTP_PORT` | number | ❌ | 587 | Porta SMTP |
| `SMTP_USER` | string | ✅ | - | Username SMTP |
| `SMTP_PASS` | string | ✅ | - | Password SMTP |
| `UPLOAD_DIR` | string | ❌ | ./uploads | Directory file uploads |
| `LOG_LEVEL` | enum | ❌ | info | `error`\|`warn`\|`info`\|`debug` |

## Appendice B: Database Schema Migrations

```sql
-- Verifica migrations applicate
SELECT * FROM "_prisma_migrations" 
ORDER BY finished_at DESC 
LIMIT 10;

-- Check integrità
npx prisma migrate status

-- Force sync (PERICOLOSO - solo development)
npx prisma db push
```

## Appendice C: Quick Rollback Script

```bash
#!/bin/bash
# rollback.sh

set -e

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: ./rollback.sh YYYYMMDD_HHMMSS"
  exit 1
fi

echo "🔄 Rolling back to $BACKUP_DATE..."

# Stop backend
pm2 stop elementmedica-api

# Restore database
sudo -u postgres pg_restore \
  -d elementmedica_prod \
  --clean \
  --if-exists \
  /var/backups/elementmedica/db_$BACKUP_DATE.dump

# Restore uploads
tar -xzf /var/backups/elementmedica/uploads_$BACKUP_DATE.tar.gz \
  -C /var/www/elementmedica/backend/

# Restart backend
pm2 start elementmedica-api

echo "✅ Rollback completed"
```

**Uso**:
```bash
chmod +x rollback.sh
./rollback.sh 20251109_020000
```
