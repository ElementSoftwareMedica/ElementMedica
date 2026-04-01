# 🔧 Troubleshooting Guide

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Quick Diagnostics

> **P64**: Proxy server (4003) ELIMINATO - Solo API (4001) e Documents (4002)

```bash
# Health checks
curl http://localhost:4001/health  # API Server
curl http://localhost:4002/health  # Documents Server

# Process status
pm2 status

# Logs
pm2 logs api-server --lines 100
```

---

## 🔴 Problemi Comuni

### Login Fallito (401 Unauthorized)

**Sintomi**: Login restituisce 401

**Cause Possibili**:
1. Password errata
2. Utente non esiste
3. Utente soft-deleted
4. Token JWT scaduto

**Soluzioni**:
```bash
# Verifica credenziali test
curl -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# Verifica utente in DB
SELECT * FROM "Person" WHERE email = 'admin@example.com' AND "deletedAt" IS NULL;
```

### API 500 Internal Error

**Sintomi**: Errori 500 su API calls

**Diagnostica**:
```bash
# Check API logs
tail -100 logs/api-server/api.log | grep -i error

# Check database connection
curl http://localhost:4001/health
```

**Cause Comuni**:
1. Database connection lost
2. Missing required field in request
3. Prisma query error

### CORS Errors

**Sintomi**: Errori CORS nel browser

**Soluzioni**:
1. Verificare `ALLOWED_ORIGINS` nel .env backend
2. Controllare che `X-Frontend-Id` header sia inviato dal frontend
3. In dev, Vite proxy gestisce il routing; in prod, Nginx
4. Verificare `backend/middleware/cors.js`

### Rate Limiting (429)

**Sintomi**: Errore 429 Too Many Requests

**Limiti Default**:
- Auth endpoints: 5 richieste / 15 minuti
- Forms pubblici: 5 richieste / 5 minuti
- API generiche: 100 richieste / minuto

**Soluzioni**:
```bash
# Check rate limit config nel middleware backend
cat backend/middleware/rateLimiting.js

# Flush Redis (dev only)
redis-cli FLUSHALL
```

---

## 🔧 Problemi Database

### Migration Failed

```bash
# Reset e rigenera
npx prisma generate
npx prisma db push --force-reset  # ⚠️ SOLO DEV - cancella dati!

# Produzione: migration incrementale
npx prisma migrate deploy
```

### Prisma Client Outdated

```bash
# Rigenera client
npx prisma generate

# Restart servers
pm2 restart all
```

### Unknown Field Error

**Sintomi**: `Unknown field 'xyz' for select statement`

**Cause**: Campo rimosso/rinominato in schema

**Soluzioni**:
1. Verificare schema.prisma
2. Rigenerare client: `npx prisma generate`
3. Cercare e aggiornare query che usano quel campo

---

## 🖥️ Problemi Frontend

### Build Failed

```bash
# Clear cache e rebuild
rm -rf node_modules/.vite
npm run build

# Verifica errori TypeScript
npx tsc --noEmit
```

### Hot Reload Non Funziona

```bash
# Restart Vite
pm2 restart vite-dev

# O manualmente
npm run dev
```

---

## 📊 Comandi Diagnostica

### Server Status

```bash
# All processes
pm2 status

# Memory usage
pm2 monit

# Logs real-time
pm2 logs
```

### Database

```bash
# Test connection
npx prisma db execute --stdin <<< "SELECT 1"

# Introspect schema
npx prisma db pull --print
```

### Network

```bash
# Check ports (P64: proxy eliminated)
lsof -i :4001  # API
lsof -i :4002  # Documents
lsof -i :5173  # Frontend dev
```

---

## ⚠️ Regole Critiche

### ❌ VIETATO senza autorizzazione:

```bash
pm2 restart/stop/delete [any-process]
kill -9 [any-pid]
sudo systemctl restart [any-service]
sudo reboot
```

### ✅ SEMPRE PERMESSO:

```bash
pm2 status
pm2 logs
pm2 monit
curl health endpoints
cat log files
```

---

## 🔗 Links Utili

- [Deployment Guide](../05-deployment/DEPLOYMENT_GUIDE.md)
- [API Reference](../02-backend/API_REFERENCE.md)
- [Architecture](../01-architecture/SYSTEM_ARCHITECTURE.md)
