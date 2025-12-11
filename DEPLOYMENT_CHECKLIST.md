# 🚀 DEPLOYMENT CHECKLIST - ElementMedica

**Data**: 4 Dicembre 2024  
**Server**: 128.140.15.15 (Hetzner Cloud)  
**Stato**: ✅ Preparativi completati

---

## ✅ COMPLETATO

### 1. Documentazione Consolidata
- [x] Creata guida unificata: `docs/deployment/DEPLOYMENT_GUIDE_UNIFIED.md`
- [x] Archiviate documentazioni obsolete in `docs/deployment/archive/`
- [x] Aggiornato `docs/deployment/README.md`

### 2. Credenziali Documentate
- [x] Hetzner: root (Fulmicotone50!), elementmedica (ElementMedica2024!)
- [x] SSH: Chiave configurata su server
- [x] Supabase: Connection strings documentate
- [x] S3 Hetzner: Access key e Secret key
- [x] JWT Secrets: Documentati

### 3. Configurazione Multi-Domain
- [x] `.env.production.formazione` creato → elementformazione.com
- [x] `.env.production.medica` creato → elementmedica.com
- [x] Configurazione Nginx multi-domain documentata

### 4. Script di Deployment
- [x] `scripts/build-production.sh` - Build entrambi i frontend
- [x] `scripts/deploy-production.sh` - Deploy su Hetzner

---

## 🔄 STATO ATTUALE

### Server 128.140.15.15
| Servizio | Stato | URL |
|----------|-------|-----|
| **Backend API** | ✅ Online | http://128.140.15.15/health |
| **Frontend** | ✅ Online | http://128.140.15.15 |
| **elementformazione.com** | ✅ DNS OK | A → 128.140.15.15 |
| **elementmedica.com** | ❌ DNS non configurato | Da configurare |

---

## 📋 PROSSIMI PASSI

### Fase 1: Configurazione DNS elementmedica.com
1. Accedi al registrar del dominio elementmedica.com
2. Configura record DNS:
   ```
   @    A    128.140.15.15
   www  A    128.140.15.15
   ```
3. Attendi propagazione DNS (15-30 minuti)

### Fase 2: Build Frontend
```bash
# Dal Mac locale
cd "/Users/matteo.michielon/project 2.0"
./scripts/build-production.sh
```
Questo genererà:
- `dist/` → elementformazione.com
- `dist-public/` → elementmedica.com

### Fase 3: Deploy su Hetzner
```bash
./scripts/deploy-production.sh
```
Oppure manualmente:
```bash
# Upload frontend CRM
rsync -avz dist/ elementmedica@128.140.15.15:/var/www/elementmedica/dist/

# Upload frontend pubblico  
rsync -avz dist-public/ elementmedica@128.140.15.15:/var/www/elementmedica/dist-public/
```

### Fase 4: Configurazione Nginx Multi-Domain
```bash
# SSH al server
ssh elementmedica@128.140.15.15

# Crea configurazione Nginx
sudo nano /etc/nginx/sites-available/elementmedica-multi

# Copia contenuto da DEPLOYMENT_GUIDE_UNIFIED.md

# Attiva configurazione
sudo ln -sf /etc/nginx/sites-available/elementmedica-multi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Fase 5: SSL Certificates
```bash
# SSL per elementformazione.com (se non già fatto)
sudo certbot --nginx -d elementformazione.com -d www.elementformazione.com

# SSL per elementmedica.com (dopo DNS configurato)
sudo certbot --nginx -d elementmedica.com -d www.elementmedica.com
```

### Fase 6: Verifica Finale
```bash
# Test CRM
curl https://elementformazione.com/health
curl -X POST https://elementformazione.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# Test Pubblico
curl https://elementmedica.com/health
```

---

## 🔐 CREDENZIALI RAPIDE

| Servizio | User | Password |
|----------|------|----------|
| **Hetzner SSH** | elementmedica | ElementMedica2024! |
| **Hetzner SSH** | root | Fulmicotone50! |
| **Test Login** | admin@example.com | Admin123! |
| **Supabase** | postgres.uywrlfkptcyhzoddsefg | Fulmicotone50! |
| **SSH Key** | passphrase | Fulmicotone50! |

---

## 📚 Riferimenti

- **Guida completa**: `docs/deployment/DEPLOYMENT_GUIDE_UNIFIED.md`
- **Backup system**: `docs/10_project_management/39_database_backup_restore/`
- **Script build**: `scripts/build-production.sh`
- **Script deploy**: `scripts/deploy-production.sh`
