# 🚀 ElementMedica 2.0 - Deploy Rapido

## 📋 Prerequisiti Completati
✅ Server Hetzner CX11 configurato  
✅ SSH Key configurata  
✅ Sistema base installato con `hetzner-complete-setup.sh`  
✅ Utente `elementmedica` creato  
✅ Firewall e sicurezza configurati  

## 🎯 Deploy in 3 Passi

### 1. 📤 Carica Script sul Server
```bash
# Dal tuo computer locale
scp -i ~/.ssh/elementmedica-hetzner-20250818 \
    ./scripts/deploy-elementmedica.sh \
    elementmedica@YOUR_SERVER_IP:/home/elementmedica/
```

### 2. 🔧 Configura Repository
Prima del deploy, assicurati che:
- Il tuo codice sia pushato su GitHub
- Il repository sia pubblico o hai configurato le chiavi SSH

### 3. 🚀 Esegui Deploy
```bash
# Connettiti al server
ssh -i ~/.ssh/elementmedica-hetzner-20250818 elementmedica@YOUR_SERVER_IP

# Rendi eseguibile lo script
chmod +x deploy-elementmedica.sh

# Esegui il deploy
./deploy-elementmedica.sh
```

## ⚙️ Configurazione .env Richiesta

Durante il deploy, dovrai configurare il file `.env` con:

### 🗄️ Database Supabase
```env
DATABASE_URL="postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres"
SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"
```

### 🔐 JWT Secrets
```bash
# Genera secrets sicuri
openssl rand -base64 32  # Per JWT_SECRET
openssl rand -base64 32  # Per REFRESH_TOKEN_SECRET
```

### 🌐 Dominio
```env
CORS_ORIGIN="https://tuodominio.com"
```

## 📊 Verifica Deploy

### Health Check
```bash
# API Server
curl http://localhost:4001/health

# Proxy Server  
curl http://localhost:4003/health
```

### Status PM2
```bash
pm2 status
pm2 logs
```

### Test Login
```bash
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'
```

## 🔒 Configurazione SSL

Dopo il deploy, configura SSL:

```bash
# Installa certificato Let's Encrypt
sudo certbot --nginx -d tuodominio.com

# Verifica auto-renewal
sudo certbot renew --dry-run
```

## 🌐 Configurazione DNS

In Cloudflare, aggiungi:
```
A    @           YOUR_SERVER_IP
A    www         YOUR_SERVER_IP
```

## 📝 Logs e Troubleshooting

### Logs Principali
```bash
# Deploy logs
tail -f /var/log/elementmedica/deploy.log

# Application logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Comandi Utili
```bash
# Restart applicazione
pm2 restart all

# Reload Nginx
sudo systemctl reload nginx

# Status servizi
sudo systemctl status nginx
sudo systemctl status ufw
```

## 🎯 Checklist Post-Deploy

- [ ] ✅ Health check API (4001) OK
- [ ] ✅ Health check Proxy (4003) OK  
- [ ] ✅ PM2 status OK
- [ ] ✅ Nginx configurato
- [ ] ✅ SSL certificato installato
- [ ] ✅ DNS configurato
- [ ] ✅ Login test OK
- [ ] ✅ Monitoring attivo

## 💰 Costo Finale

**€4.78/mese** per:
- Hetzner CX11: €4.15/mese
- Backup automatici: €0.63/mese
- Supabase: Gratuito
- Cloudflare: Gratuito

## 🆘 Supporto

In caso di problemi:
1. Controlla i logs: `pm2 logs`
2. Verifica status: `pm2 status`
3. Test health: `curl http://localhost:4003/health`
4. Restart se necessario: `pm2 restart all`

---

**🎉 ElementMedica 2.0 sarà live e funzionante!**