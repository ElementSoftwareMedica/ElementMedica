# ElementMedica 2.0 - Guida Deployment Startup

## 🎯 Configurazione Attuale

### Server Hetzner CX11
- **IP**: 128.140.15.15
- **Tipo**: CX11 (2GB RAM, 1 vCPU, 20GB SSD)
- **Costo**: €3.29/mese
- **OS**: Ubuntu 22.04

### Credenziali di Accesso
```bash
# Root Access
User: root
Password: TtnfAHscuFAj

# Utente Applicazione
User: elementmedica
Password: ElementMedica2024!

# SSH Key
Path: ~/.ssh/id_ed25519
Fingerprint: SHA256:9ds7HzWFOSjW4kWvh18V20Ahmd5xPTEf3X9Cc3aAsFY
```

### Database Supabase
```bash
# Connection Pooling (Recommended)
DATABASE_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct Connection (Migrations)
DIRECT_URL="postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
```

### Storage Hetzner Object Storage
```bash
Access Key: DKLDOG0PF3DSAEKPQUIC
Secret Key: wOaXikG57wymcFYK2EFZZedl9jETCyGTabrqQMPB
Endpoint: https://s3.eu-central-1.hetzner.com
Region: eu-central-1
```

### API Hetzner Cloud
```bash
API Token: BFpwGfbfmUbcyOnMqdX5JzfsPOtxWReN3INQveUP9o14Bp38wucgFkhR2vfe3ql0
```

## 🚀 Setup Rapido

### ⚠️ IMPORTANTE: SSH Non Funzionante
**Il cloud-init non ha configurato correttamente SSH. Usa SOLO la console web.**

### Opzione 1: Console Web Hetzner (OBBLIGATORIO)
1. Vai su https://console.hetzner.cloud/
2. Seleziona il server "ubuntu-2gb-nbg1-1" (Status: running)
3. Clicca "Console" per accedere via browser
4. Login: `root` / Password: `J4w3LEdLvbn9`
5. Esegui i comandi del setup manuale

### ❌ SSH Non Disponibile
```bash
# QUESTI COMANDI NON FUNZIONANO:
ssh root@128.140.15.15          # Permission denied
ssh -i ~/.ssh/id_ed25519 root@128.140.15.15  # Permission denied

# Motivo: Cloud-init non ha configurato SSH correttamente
# Soluzione: Configurazione manuale via console web
```

## 🔧 Setup Manuale Server

### 1. Aggiornamento Sistema
```bash
apt update && apt upgrade -y
```

### 2. Installazione Stack Base
```bash
# Pacchetti essenziali
apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    ufw fail2ban nginx

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

# Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo 'deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable' | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update && apt install -y docker-ce docker-ce-cli containerd.io
```

### 3. Configurazione Utenti e SSH
```bash
# Crea utente elementmedica
useradd -m -s /bin/bash elementmedica
echo 'elementmedica:ElementMedica2024!' | chpasswd
usermod -aG sudo,docker elementmedica

# IMPORTANTE: Configura SSH correttamente
# Abilita autenticazione password per SSH
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Configura SSH keys
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFj/Zfz2eb5eKKvjchGg8i2E5IzeIr4Nx7xLC1UxSnlY formazioneperimpresa@gmail.com' > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Configura SSH per utente elementmedica
mkdir -p /home/elementmedica/.ssh && chmod 700 /home/elementmedica/.ssh
cp /root/.ssh/authorized_keys /home/elementmedica/.ssh/
chown -R elementmedica:elementmedica /home/elementmedica/.ssh

# Riavvia SSH service
systemctl restart ssh
systemctl enable ssh

echo "✅ SSH configurato - Test: ssh root@128.140.15.15"
```

### 4. Configurazione Sicurezza
```bash
# UFW Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Fail2Ban
systemctl enable fail2ban && systemctl start fail2ban

# Swap 2GB
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 5. Configurazione Nginx
```bash
# Directory applicazione
mkdir -p /var/www/elementmedica
chown -R elementmedica:elementmedica /var/www/elementmedica

# Configurazione Nginx
cat > /etc/nginx/sites-available/elementmedica << 'EOF'
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Attiva configurazione
ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 📦 Deploy Applicazione

### 1. Deploy Codice Applicazione
```bash
# NOTA: Repository GitHub vuota - Deploy da codice locale
# Come utente elementmedica
su - elementmedica
cd /var/www/elementmedica

# Opzione 1: Copia da locale (raccomandato)
# scp -r ./project-2.0/* elementmedica@128.140.15.15:/var/www/elementmedica/

# Opzione 2: Inizializza directory vuota e copia manualmente
# mkdir -p /var/www/elementmedica
# Copia i file del progetto nella directory

echo "⚠️ Repository GitHub vuota - Codice deve essere copiato manualmente"
echo "📁 Directory pronta: /var/www/elementmedica"
```

### 2. Configurazione Environment
```bash
# Copia file .env.startup come .env
cp .env.startup .env

# Modifica se necessario
nano .env
```

### 3. Installazione Dipendenze
```bash
# Frontend
npm install
npm run build

# Backend
cd backend
npm install
```

### 4. Setup Database
```bash
# Migrazioni Prisma
npx prisma migrate deploy
npx prisma generate
```

### 5. Avvio Servizi
```bash
# Avvia con PM2
pm2 start ecosystem.startup.config.js
pm2 save
pm2 startup
```

## 🔍 Verifica Setup

### Test Connessioni
```bash
# SSH
ssh -i ~/.ssh/id_ed25519 elementmedica@128.140.15.15
ssh elementmedica@128.140.15.15  # Password: ElementMedica2024!

# Servizi
curl http://128.140.15.15/nginx-health
curl http://128.140.15.15/api/health
```

### Verifica Stack
```bash
# Versioni installate
node --version    # v20.x.x
npm --version     # 10.x.x
pm2 --version     # 5.x.x
docker --version  # 24.x.x
nginx -v          # 1.18.x

# Servizi attivi
systemctl is-active nginx
systemctl is-active docker
systemctl is-active fail2ban
ufw status
free -h  # Verifica swap
```

### Verifica PM2
```bash
pm2 status
pm2 logs
pm2 monit
```

## 🌐 Configurazione Dominio

### 1. DNS Cloudflare
```bash
# Aggiungi record A
Type: A
Name: @
Content: 128.140.15.15
Proxy: Enabled (nuvola arancione)

# Aggiungi record CNAME per www
Type: CNAME
Name: www
Content: yourdomain.com
Proxy: Enabled
```

### 2. SSL Let's Encrypt
```bash
# Installa certbot
apt install -y certbot python3-certbot-nginx

# Ottieni certificato
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verifica auto-renewal
certbot renew --dry-run
```

## 📊 Monitoring

### UptimeRobot (Gratuito)
1. Registrati su https://uptimerobot.com/
2. Aggiungi monitor HTTP per http://yourdomain.com
3. Configura notifiche email

### Log Monitoring
```bash
# Log applicazione
tail -f /var/log/elementmedica/app.log

# Log Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Log sistema
journalctl -f -u nginx
journalctl -f -u docker
```

## 🔄 Backup

### Database Backup
```bash
# Script backup giornaliero
cat > /home/elementmedica/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/elementmedica/backups"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump "postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" > $BACKUP_DIR/db_backup_$DATE.sql

# Comprimi
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Rimuovi backup vecchi (>7 giorni)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /home/elementmedica/backup-db.sh

# Aggiungi a crontab
echo "0 2 * * * /home/elementmedica/backup-db.sh" | crontab -
```

## 🚨 Troubleshooting

### Problemi Comuni

#### SSH Non Funziona
```bash
# Usa console web Hetzner
# https://console.hetzner.cloud/

# Verifica SSH service
systemctl status ssh
systemctl restart ssh

# Verifica firewall
ufw status
ufw allow 22/tcp
```

#### Applicazione Non Risponde
```bash
# Verifica PM2
pm2 status
pm2 restart all

# Verifica Nginx
nginx -t
systemctl restart nginx

# Verifica porte
netstat -tlnp | grep -E ':(80|443|4001|4003)'
```

#### Memoria Insufficiente
```bash
# Verifica memoria
free -h
df -h

# Verifica swap
swapon --show

# Pulisci cache
apt autoremove -y
apt autoclean
docker system prune -f
```

## 📞 Supporto

### Contatti
- **Email**: admin@elementmedica.com
- **Documentazione**: `/docs/`
- **Repository**: https://github.com/your-repo/elementmedica-2.0

### Risorse Utili
- **Hetzner Console**: https://console.hetzner.cloud/
- **Supabase Dashboard**: https://app.supabase.com/
- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **UptimeRobot**: https://uptimerobot.com/

---

## ✅ Checklist Deployment

- [ ] Server Hetzner configurato
- [ ] SSH funzionante
- [ ] Stack installato (Node.js, Docker, Nginx)
- [ ] Utente elementmedica creato
- [ ] Firewall configurato
- [ ] Applicazione deployata
- [ ] Database configurato
- [ ] PM2 configurato
- [ ] DNS configurato
- [ ] SSL configurato
- [ ] Monitoring attivo
- [ ] Backup configurato

**ElementMedica 2.0 è pronto per la produzione!** 🚀

---

*Costo totale: €4.78/mese*  
*Uptime target: 99.5%*  
*Configurazione: Startup Optimized*