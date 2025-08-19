# ⚡ Setup Immediato ElementMedica 2.0 su Hetzner

## 🚀 Procedura Rapida (30 minuti totali)

### 📋 Prerequisiti (2 minuti)
```bash
# 1. Verifica SSH key locale
ls -la ~/.ssh/elementmedica_hetzner*

# Se non esiste, copia dal progetto:
cp "/Users/matteo.michielon/project 2.0/elementmedica_hetzner" ~/.ssh/
cp "/Users/matteo.michielon/project 2.0/elementmedica_hetzner.pub" ~/.ssh/
chmod 600 ~/.ssh/elementmedica_hetzner
chmod 644 ~/.ssh/elementmedica_hetzner.pub

# 2. Verifica contenuto chiave pubblica
cat ~/.ssh/elementmedica_hetzner.pub
```

**Chiave pubblica da copiare:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFo0py3Gu9Vpp9Zg0nrVzCDC3ReR8B9SLn7Bu/YZIdzp elementmedica-hetzner-20250818
```

---

## 🖥️ STEP 1: Creazione Server Hetzner (5 minuti)

### 1.1 Accesso Console Hetzner
```
URL: https://console.hetzner.cloud/
1. Accedi al tuo account Hetzner
2. Crea nuovo progetto: "ElementMedica-Production"
3. Clicca "Add Server"
```

### 1.2 Configurazione Server
```yaml
# === SELEZIONI OBBLIGATORIE ===
Location: Nuremberg (nbg1-dc3)
Image: Ubuntu 22.04 LTS
Type: CX11 (€3.29/mese)
Name: elementmedica-prod-01

# === SSH KEY ===
1. Clicca "Add SSH Key"
2. Nome: "elementmedica-production-key"
3. Incolla la chiave pubblica sopra
4. Salva

# === FIREWALL ===
1. Clicca "Create Firewall"
2. Nome: "elementmedica-security"
3. Aggiungi regole:
   - SSH (22): Solo il tuo IP
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0

# === BACKUP ===
✅ Enable Backups (+€0.66/mese)

# === FINALIZZA ===
Clicca "Create & Buy Now"
```

### 1.3 Attesa Creazione (2-3 minuti)
```
Stato: Creating → Running
Copia l'IP pubblico assegnato: [SALVA_QUESTO_IP]
```

---

## 🔑 STEP 2: Primo Accesso SSH (2 minuti)

```bash
# Sostituisci [IP_SERVER] con l'IP copiato sopra
ssh -i ~/.ssh/elementmedica_hetzner root@[IP_SERVER]

# Se richiesto, digita "yes" per accettare il fingerprint
# Dovresti vedere il prompt: root@elementmedica-prod-01:~#
```

---

## ⚙️ STEP 3: Setup Automatico Sistema (15 minuti)

### 3.1 Download e Esecuzione Script
```bash
# Sul server Hetzner, esegui:
cd /root
wget https://raw.githubusercontent.com/tuouser/elementmedica-2.0/main/scripts/startup-setup.sh
chmod +x startup-setup.sh
./startup-setup.sh
```

### 3.2 Configurazione Interattiva
```bash
# Lo script chiederà:
1. Domain name: tuodominio.com
2. Admin email: tua-email@example.com
3. Database password: [GENERA_PASSWORD_SICURA]
4. Conferma installazione: y

# Tempo stimato: 10-15 minuti
# Output finale: "✅ Setup completato con successo!"
```

---

## 🌐 STEP 4: Configurazione DNS Cloudflare (5 minuti)

### 4.1 Accesso Cloudflare Dashboard
```
URL: https://dash.cloudflare.com/
1. Seleziona il tuo dominio
2. Vai su "DNS" → "Records"
```

### 4.2 Configurazione Record DNS
```yaml
# === RECORD A PRINCIPALE ===
Type: A
Name: @
Content: [IP_SERVER_HETZNER]
Proxy status: ✅ Proxied (nuvola arancione)
TTL: Auto

# === RECORD A WWW ===
Type: A  
Name: www
Content: [IP_SERVER_HETZNER]
Proxy status: ✅ Proxied (nuvola arancione)
TTL: Auto

# === SALVA ===
Clicca "Save" per entrambi i record
```

### 4.3 Verifica Propagazione DNS (2-5 minuti)
```bash
# Dal tuo Mac, verifica:
nslookup tuodominio.com
nslookup www.tuodominio.com

# Dovrebbero restituire l'IP del server Hetzner
```

---

## 📦 STEP 5: Deploy Applicazione (10 minuti)

### 5.1 Accesso come Utente Applicazione
```bash
# Sul server Hetzner:
su - elementmedica
cd /home/elementmedica
```

### 5.2 Clone Repository e Configurazione
```bash
# Clone del repository (sostituisci con il tuo repo)
git clone https://github.com/tuouser/elementmedica-2.0.git app
cd app

# Configurazione ambiente
cp .env.example .env
nano .env
```

### 5.3 Configurazione File .env
```bash
# === CONFIGURAZIONE OBBLIGATORIA ===
NODE_ENV=production
PORT=4001
PROXY_PORT=4003

# Database (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/database"

# JWT
JWT_SECRET="[GENERA_SECRET_SICURO_32_CARATTERI]"
JWT_EXPIRES_IN="24h"

# Domain
DOMAIN="tuodominio.com"
FRONTEND_URL="https://tuodominio.com"

# Email (Brevo/SendGrid)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="tua-email@example.com"
SMTP_PASS="[SMTP_PASSWORD]"

# Salva con Ctrl+X, Y, Enter
```

### 5.4 Deploy Automatico
```bash
# Esegui script di deploy
chmod +x scripts/deploy-startup.sh
./scripts/deploy-startup.sh

# Output atteso:
# ✅ Dependencies installed
# ✅ Database migrated  
# ✅ Application built
# ✅ PM2 processes started
# ✅ Deploy completed successfully!
```

---

## 🔒 STEP 6: Configurazione SSL (3 minuti)

### 6.1 Installazione Certificato Let's Encrypt
```bash
# Torna come root
exit  # per uscire da utente elementmedica
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com

# Rispondi alle domande:
# Email: tua-email@example.com
# Terms: A (Accept)
# Share email: N (No)
# Which names: 1,2 (entrambi i domini)
```

### 6.2 Test Rinnovo Automatico
```bash
sudo certbot renew --dry-run
# Output atteso: "Congratulations, all renewals succeeded"
```

---

## ✅ STEP 7: Verifica Finale (2 minuti)

### 7.1 Test Connettività
```bash
# Dal tuo Mac:
cd "/Users/matteo.michielon/project 2.0"
./scripts/hetzner-verify.sh [IP_SERVER] tuodominio.com

# Output atteso: tutti i test ✅ PASS
```

### 7.2 Test Applicazione
```bash
# Test health check
curl https://tuodominio.com/health
# Output: {"status":"healthy","timestamp":"..."}

# Test API
curl https://tuodominio.com/api/health  
# Output: {"status":"healthy","database":"connected"}

# Test login (browser)
# URL: https://tuodominio.com/login
# Credenziali: admin@example.com / Admin123!
```

---

## 📊 STEP 8: Configurazione Monitoring (5 minuti)

### 8.1 UptimeRobot Setup
```
URL: https://uptimerobot.com/
1. Crea account gratuito
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: https://tuodominio.com/health
   - Name: ElementMedica Health
   - Interval: 5 minutes
3. Add New Monitor:
   - Type: HTTP(s)  
   - URL: https://tuodominio.com/api/health
   - Name: ElementMedica API
   - Interval: 5 minutes
```

### 8.2 Configurazione Alerting
```yaml
# === NOTIFICHE ===
Email: tua-email@example.com
Telegram: (opzionale)
Webhook: (opzionale)

# === SOGLIE ===
Down for: 2 minutes
Up for: 1 minute
```

---

## 🎯 Checklist Finale

### ✅ Verifica Completamento
- [ ] Server Hetzner CX11 creato e attivo
- [ ] SSH key funzionante
- [ ] Sistema Ubuntu 22.04 configurato
- [ ] DNS Cloudflare configurato
- [ ] SSL Let's Encrypt installato
- [ ] Applicazione deployata
- [ ] PM2 processi attivi
- [ ] Health check funzionanti
- [ ] Login amministratore funzionante
- [ ] Monitoring UptimeRobot configurato
- [ ] Backup automatici abilitati

### 🔍 Test Finali
```bash
# 1. Test SSH
ssh -i ~/.ssh/elementmedica_hetzner elementmedica@[IP_SERVER]

# 2. Test HTTPS
curl -I https://tuodominio.com
# Status: 200 OK

# 3. Test API
curl https://tuodominio.com/api/health
# {"status":"healthy"}

# 4. Test PM2
ssh -i ~/.ssh/elementmedica_hetzner elementmedica@[IP_SERVER] "pm2 status"
# Tutti i processi: online

# 5. Test SSL
openssl s_client -connect tuodominio.com:443 -servername tuodominio.com < /dev/null
# Verify return code: 0 (ok)
```

---

## 💰 Riepilogo Costi

**Costo Mensile: €4.78**
- Hetzner CX11: €3.29
- Hetzner Backup: €0.66
- Dominio: €0.83 (€10/anno)
- Tutto il resto: €0.00 (Free Tier)

**ElementMedica 2.0 è LIVE! 🚀**

---

## 🆘 Troubleshooting Rapido

### Problema: SSH non funziona
```bash
# Verifica chiave
ssh-keygen -l -f ~/.ssh/elementmedica_hetzner.pub
# Verifica permessi
chmod 600 ~/.ssh/elementmedica_hetzner
```

### Problema: DNS non risolve
```bash
# Verifica propagazione
dig tuodominio.com
# Attendi 5-10 minuti per propagazione
```

### Problema: SSL non funziona
```bash
# Riprova certbot
sudo certbot --nginx -d tuodominio.com --force-renewal
```

### Problema: Applicazione non risponde
```bash
# Verifica PM2
ssh -i ~/.ssh/elementmedica_hetzner elementmedica@[IP_SERVER]
pm2 status
pm2 logs
```

### Supporto
- **Documentazione**: `/Users/matteo.michielon/project 2.0/HETZNER_SETUP_GUIDE.md`
- **Verifica**: `./scripts/hetzner-verify.sh`
- **Backup**: `./scripts/backup-startup.sh`

---

*Setup completato in 30 minuti! 🎉*