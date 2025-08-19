# 🚀 Final Deployment - ElementMedica 2.0

## Panoramica

Questa guida fornisce le istruzioni finali per il deploy completo di ElementMedica 2.0 in produzione, includendo tutti i test necessari per verificare il corretto funzionamento del sistema.

## 📋 Pre-requisiti

Prima di procedere, assicurarsi che siano completati:

- ✅ **Database PostgreSQL** configurato in cloud
- ✅ **Server cloud** configurato e sicuro
- ✅ **Docker** installato e funzionante
- ✅ **Dominio** configurato con DNS
- ✅ **Certificati SSL** ottenuti e configurati
- ✅ **Repository GitHub** configurato con CI/CD
- ✅ **Monitoring** configurato

## 🎯 Checklist Pre-Deploy

### 1. Verifica Infrastruttura

```bash
# Connessione al server
ssh ubuntu@your-server-ip

# Verifica servizi base
sudo systemctl status nginx
sudo systemctl status docker
sudo systemctl status fail2ban

# Verifica spazio disco
df -h

# Verifica memoria
free -h

# Verifica porte
sudo netstat -tlnp | grep -E ":(80|443|22)\s"
```

### 2. Verifica Database

```bash
# Test connessione database
psql "$DATABASE_URL" -c "SELECT version();"

# Verifica schema
psql "$DATABASE_URL" -c "\dt elementmedica.*"

# Test performance database
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('elementmedica_prod'));"
```

### 3. Verifica SSL

```bash
# Test certificato SSL
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# Verifica scadenza
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test redirect
curl -I http://your-domain.com
curl -I https://www.your-domain.com
```

## 🚀 Procedura Deploy

### 1. Preparazione Repository

```bash
# NOTA: Repository GitHub vuota - Deploy da codice locale
# Prepara directory applicazione
cd /opt/elementmedica
mkdir -p app
cd app

# Copia codice da locale (eseguire dal computer locale):
# scp -r ./project-2.0/* root@server-ip:/opt/elementmedica/app/

echo "⚠️ Repository GitHub vuota - Codice deve essere copiato manualmente"
echo "📁 Directory pronta: /opt/elementmedica/app"

# Verifica file necessari dopo la copia
ls -la docker-compose.production.yml
ls -la .env.example
ls -la deploy.sh
```

### 2. Configurazione Environment

```bash
# Copia e configura environment
cp .env.example .env.production

# Genera segreti sicuri
echo "# Generated secrets $(date)" >> .env.production
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.production
echo "CSRF_SECRET=$(openssl rand -base64 32)" >> .env.production

# Configura database
echo "DATABASE_URL=postgresql://elementmedica_app:password@your-db-host:5432/elementmedica_prod?schema=elementmedica&sslmode=require" >> .env.production

# Configura dominio
echo "FRONTEND_URL=https://your-domain.com" >> .env.production
echo "BACKEND_URL=https://your-domain.com" >> .env.production
echo "CORS_ORIGIN=https://your-domain.com" >> .env.production

# Configura email (esempio con SendGrid)
echo "EMAIL_PROVIDER=sendgrid" >> .env.production
echo "SENDGRID_API_KEY=your-sendgrid-api-key" >> .env.production
echo "EMAIL_FROM=noreply@your-domain.com" >> .env.production

# Configura storage
echo "UPLOAD_PATH=/opt/elementmedica/data/uploads" >> .env.production
echo "MAX_FILE_SIZE=10485760" >> .env.production

# Configura logging
echo "LOG_LEVEL=info" >> .env.production
echo "LOG_FILE=/opt/elementmedica/logs/app/elementmedica.log" >> .env.production
```

### 3. Build e Deploy

```bash
# Build immagini Docker
docker compose -f docker-compose.production.yml build --no-cache

# Verifica immagini
docker images | grep elementmedica

# Start servizi database prima
docker compose -f docker-compose.production.yml up -d postgres redis

# Attendi che i servizi siano pronti
sleep 30

# Verifica servizi database
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs postgres
docker compose -f docker-compose.production.yml logs redis
```

### 4. Migrazione Database

```bash
# Genera client Prisma
docker compose -f docker-compose.production.yml exec backend npx prisma generate

# Deploy schema database
docker compose -f docker-compose.production.yml exec backend npx prisma db push

# Seed dati iniziali
docker compose -f docker-compose.production.yml exec backend npx prisma db seed

# Verifica tabelle create
docker compose -f docker-compose.production.yml exec postgres psql -U elementmedica_app -d elementmedica_prod -c "\dt elementmedica.*"
```

### 5. Start Applicazione

```bash
# Start tutti i servizi
docker compose -f docker-compose.production.yml up -d

# Verifica tutti i container
docker compose -f docker-compose.production.yml ps

# Verifica log per errori
docker compose -f docker-compose.production.yml logs --tail=50
```

## 🧪 Test Completi

### 1. Test Health Check

```bash
# Test health check API
curl -f http://localhost:4001/health

# Test health check Proxy
curl -f http://localhost:4003/health

# Test health check Frontend
curl -f http://localhost:5173

# Test health check esterno
curl -f https://your-domain.com/health
```

### 2. Test Autenticazione

```bash
# Test login API
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "Admin123!"
  }'

# Test registrazione
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Test Database

```bash
# Test connessione database
docker compose -f docker-compose.production.yml exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.person.count().then(count => {
  console.log('Total persons:', count);
  process.exit(0);
}).catch(err => {
  console.error('Database error:', err);
  process.exit(1);
});
"

# Test performance query
docker compose -f docker-compose.production.yml exec postgres psql -U elementmedica_app -d elementmedica_prod -c "
EXPLAIN ANALYZE SELECT * FROM elementmedica.person LIMIT 10;
"
```

### 4. Test Frontend

```bash
# Test caricamento pagina principale
curl -s https://your-domain.com | grep -q "ElementMedica" && echo "✅ Frontend OK" || echo "❌ Frontend Error"

# Test risorse statiche
curl -I https://your-domain.com/favicon.ico

# Test redirect
curl -I http://your-domain.com 2>&1 | grep "301"
curl -I https://www.your-domain.com 2>&1 | grep "301"
```

### 5. Test SSL e Sicurezza

```bash
# Test SSL Labs (online)
# https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com

# Test security headers
curl -I https://your-domain.com | grep -E "(Strict-Transport|X-Frame|X-Content|X-XSS)"

# Test HSTS
curl -I https://your-domain.com | grep "Strict-Transport-Security"

# Test CSP
curl -I https://your-domain.com | grep "Content-Security-Policy"
```

### 6. Test Performance

```bash
# Test tempo risposta
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com

# Test carico API
for i in {1..10}; do
  curl -s -w "%{time_total}\n" -o /dev/null https://your-domain.com/api/health
done

# Test concorrenza
ab -n 100 -c 10 https://your-domain.com/
```

## 📊 Monitoring Post-Deploy

### 1. Verifica Metriche

```bash
# Accesso Grafana
echo "Grafana: https://your-domain.com:3000"
echo "Username: admin"
echo "Password: $(docker compose -f docker-compose.production.yml exec grafana cat /var/lib/grafana/grafana.ini | grep admin_password)"

# Verifica Prometheus
curl http://localhost:9090/api/v1/query?query=up

# Verifica metriche applicazione
curl http://localhost:4001/metrics
curl http://localhost:4003/metrics
```

### 2. Setup Alerting

```bash
# Test alert manager
curl http://localhost:9093/api/v1/alerts

# Test notifiche email
docker compose -f docker-compose.production.yml exec alertmanager amtool alert add alertname="test" severity="warning"
```

### 3. Verifica Backup

```bash
# Test backup database
/opt/elementmedica/backup.sh

# Verifica backup creati
ls -la /opt/elementmedica/backups/

# Test restore (su database test)
psql "postgresql://user:pass@host:5432/test_db" < /opt/elementmedica/backups/latest_backup.sql
```

## 🔧 Troubleshooting

### Problemi Comuni

**1. Container non si avvia**
```bash
# Verifica log container
docker compose -f docker-compose.production.yml logs [service-name]

# Verifica risorse
docker stats

# Restart servizio specifico
docker compose -f docker-compose.production.yml restart [service-name]
```

**2. Database non raggiungibile**
```bash
# Test connessione diretta
telnet your-db-host 5432

# Verifica variabili ambiente
docker compose -f docker-compose.production.yml exec backend env | grep DATABASE

# Test da container
docker compose -f docker-compose.production.yml exec backend psql "$DATABASE_URL" -c "SELECT 1;"
```

**3. SSL non funziona**
```bash
# Verifica certificati
sudo certbot certificates

# Test configurazione Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verifica log Nginx
sudo tail -f /var/log/nginx/error.log
```

**4. Performance lente**
```bash
# Verifica risorse sistema
htop
iostat 1 5

# Verifica log applicazione
docker compose -f docker-compose.production.yml logs --tail=100 backend

# Verifica query database lente
docker compose -f docker-compose.production.yml exec postgres psql -U elementmedica_app -d elementmedica_prod -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
"
```

## 🚨 Rollback Procedure

### In caso di problemi critici

```bash
# 1. Stop applicazione
docker compose -f docker-compose.production.yml down

# 2. Backup stato corrente
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)

# 3. Restore backup database
psql "$DATABASE_URL" < /opt/elementmedica/backups/latest_backup.sql

# 4. Checkout versione precedente
git log --oneline -10
git checkout [previous-commit-hash]

# 5. Rebuild e restart
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# 6. Verifica funzionamento
curl -f https://your-domain.com/health
```

## 📈 Ottimizzazioni Post-Deploy

### 1. Performance Tuning

```bash
# Ottimizzazione PostgreSQL
docker compose -f docker-compose.production.yml exec postgres psql -U elementmedica_app -d elementmedica_prod -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
SELECT pg_reload_conf();
"

# Ottimizzazione Redis
docker compose -f docker-compose.production.yml exec redis redis-cli CONFIG SET maxmemory 256mb
docker compose -f docker-compose.production.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### 2. Scaling

```bash
# Scale servizi se necessario
docker compose -f docker-compose.production.yml up -d --scale backend=2
docker compose -f docker-compose.production.yml up -d --scale frontend=2

# Verifica load balancing
curl https://your-domain.com/api/health
```

### 3. Caching

```bash
# Verifica cache Redis
docker compose -f docker-compose.production.yml exec redis redis-cli INFO memory
docker compose -f docker-compose.production.yml exec redis redis-cli INFO stats

# Configurazione cache Nginx
sudo nano /etc/nginx/sites-available/elementmedica
# Aggiungere configurazioni cache per static assets
```

## 📋 Checklist Post-Deploy

- [ ] **Tutti i servizi** sono running
- [ ] **Health check** passano
- [ ] **Login** funziona
- [ ] **Database** è accessibile
- [ ] **SSL** è configurato correttamente
- [ ] **Redirect** HTTP→HTTPS funziona
- [ ] **Security headers** sono presenti
- [ ] **Monitoring** è attivo
- [ ] **Backup** è configurato
- [ ] **Log** sono accessibili
- [ ] **Performance** è accettabile
- [ ] **Email** funziona (se configurato)
- [ ] **Upload file** funziona
- [ ] **API** rispondono correttamente
- [ ] **Frontend** carica correttamente
- [ ] **Grafana** è accessibile
- [ ] **Alerting** è configurato

## 🎯 Prossimi Passi

1. **Monitoraggio continuo** per 24-48 ore
2. **Test carico** con utenti reali
3. **Ottimizzazioni** basate su metriche
4. **Documentazione** procedure operative
5. **Training** team su monitoring
6. **Backup strategy** validation
7. **Disaster recovery** testing

## 📞 Supporto Post-Deploy

### Contatti Emergency
- **System Admin**: admin@your-domain.com
- **Database**: dba@your-domain.com
- **Security**: security@your-domain.com

### Log Locations
- **Application**: `/opt/elementmedica/logs/app/`
- **Nginx**: `/var/log/nginx/`
- **System**: `/var/log/syslog`
- **Docker**: `docker compose logs`

### Monitoring URLs
- **Grafana**: `https://your-domain.com:3000`
- **Prometheus**: `http://your-server-ip:9090`
- **Health Check**: `https://your-domain.com/health`

---

**🎉 Congratulazioni! ElementMedica 2.0 è ora online e operativo!**

Ricorda di monitorare costantemente le metriche e mantenere aggiornati tutti i componenti del sistema.