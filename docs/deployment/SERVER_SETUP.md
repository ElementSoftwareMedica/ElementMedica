# 🖥️ Server Setup - ElementMedica 2.0

## Panoramica

Questa guida fornisce istruzioni dettagliate per configurare un server cloud per ElementMedica 2.0, con opzioni per AWS EC2 e DigitalOcean Droplet.

## 🎯 Opzioni Server Cloud

### Opzione 1: DigitalOcean Droplet (CONSIGLIATA)

#### Vantaggi
- ✅ Costi più contenuti
- ✅ Interfaccia semplice e intuitiva
- ✅ SSD incluso di default
- ✅ Backup automatici opzionali
- ✅ Monitoraggio integrato
- ✅ Firewall cloud incluso
- ✅ Snapshots facili

#### Configurazione DigitalOcean

**1. Creazione Droplet**
```bash
# Via DigitalOcean CLI (doctl)
doctl compute droplet create elementmedica-prod \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-2gb \
  --region fra1 \
  --ssh-keys your-ssh-key-id \
  --enable-monitoring \
  --enable-ipv6 \
  --tag-names production,elementmedica
```

**2. Configurazione Consigliata**
- **OS**: Ubuntu 22.04 LTS x64
- **Piano**: Basic (2 vCPU, 2GB RAM, 50GB SSD) - €18/mese
- **Regione**: Frankfurt (fra1) per latenza EU
- **Backup**: Abilitato (+20% costo)
- **Monitoring**: Abilitato (gratuito)
- **Firewall**: Configurato via cloud

### Opzione 2: AWS EC2

#### Vantaggi
- ✅ Scalabilità avanzata
- ✅ Integrazione AWS completa
- ✅ Auto Scaling Groups
- ✅ Load Balancer integrato
- ✅ CloudWatch monitoring
- ✅ Elastic IP

#### Configurazione AWS EC2

**1. Creazione via AWS CLI**
```bash
# Creazione key pair
aws ec2 create-key-pair \
  --key-name elementmedica-prod-key \
  --query 'KeyMaterial' \
  --output text > elementmedica-prod-key.pem
chmod 400 elementmedica-prod-key.pem

# Creazione security group
aws ec2 create-security-group \
  --group-name elementmedica-prod-sg \
  --description "ElementMedica Production Security Group"

# Regole security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Lancio istanza
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --count 1 \
  --instance-type t3.small \
  --key-name elementmedica-prod-key \
  --security-group-ids sg-12345678 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=elementmedica-prod}]'
```

**2. Configurazione Consigliata**
- **Instance Type**: t3.small (2 vCPU, 2GB RAM) - ~$17/mese
- **Storage**: 20GB GP3 SSD
- **OS**: Ubuntu 22.04 LTS
- **Elastic IP**: Assegnato
- **CloudWatch**: Monitoring dettagliato

## 🔧 Setup Server Base

### 1. Connessione e Setup Iniziale

```bash
# Connessione SSH
ssh -i elementmedica-prod-key.pem ubuntu@your-server-ip

# Update sistema
sudo apt update && sudo apt upgrade -y

# Installazione pacchetti base
sudo apt install -y \
  curl \
  wget \
  git \
  unzip \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release \
  htop \
  nano \
  vim \
  fail2ban \
  ufw
```

### 2. Configurazione Firewall

```bash
# Configurazione UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Verifica status
sudo ufw status verbose
```

### 3. Configurazione Fail2Ban

```bash
# Configurazione Fail2Ban per SSH
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

## 🐳 Installazione Docker

### 1. Installazione Docker Engine

```bash
# Rimozione versioni precedenti
sudo apt remove docker docker-engine docker.io containerd runc

# Aggiunta repository Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installazione Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Aggiunta utente al gruppo docker
sudo usermod -aG docker $USER
newgrp docker

# Verifica installazione
docker --version
docker compose version
```

### 2. Configurazione Docker

```bash
# Configurazione daemon Docker
sudo tee /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false
}
EOF

# Restart Docker
sudo systemctl restart docker
sudo systemctl enable docker
```

## 📁 Setup Directory Structure

```bash
# Creazione struttura directory
sudo mkdir -p /opt/elementmedica/{app,data,logs,backups,ssl}
sudo mkdir -p /opt/elementmedica/data/{postgres,redis,uploads}
sudo mkdir -p /opt/elementmedica/logs/{app,nginx,system}

# Permessi directory
sudo chown -R $USER:$USER /opt/elementmedica
chmod -R 755 /opt/elementmedica

# Creazione utente applicazione
sudo useradd -r -s /bin/false -d /opt/elementmedica elementmedica
sudo chown -R elementmedica:elementmedica /opt/elementmedica/data
sudo chown -R elementmedica:elementmedica /opt/elementmedica/logs
```

## 🔐 Setup SSH e Sicurezza

### 1. Configurazione SSH Avanzata

```bash
# Backup configurazione SSH
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Configurazione SSH sicura
sudo tee /etc/ssh/sshd_config << EOF
Port 22
Protocol 2
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
X11Forwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 2
AllowUsers ubuntu
EOF

# Restart SSH
sudo systemctl restart sshd
```

### 2. Setup Chiavi SSH Multiple

```bash
# Aggiunta chiavi SSH team
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Aggiungere chiavi pubbliche team in ~/.ssh/authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2E... admin@elementmedica.com" >> ~/.ssh/authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2E... deploy@elementmedica.com" >> ~/.ssh/authorized_keys

chmod 600 ~/.ssh/authorized_keys
```

## 🌐 Setup Nginx

### 1. Installazione Nginx

```bash
# Installazione Nginx
sudo apt install -y nginx

# Configurazione base
sudo systemctl start nginx
sudo systemctl enable nginx

# Test configurazione
sudo nginx -t
```

### 2. Configurazione Nginx per ElementMedica

```bash
# Rimozione configurazione default
sudo rm /etc/nginx/sites-enabled/default

# Configurazione ElementMedica
sudo tee /etc/nginx/sites-available/elementmedica << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (will be updated with Let's Encrypt)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API routes
    location /api/ {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://your-domain.com";
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
    }
    
    # Health checks
    location /health {
        proxy_pass http://localhost:4003/health;
        access_log off;
    }
    
    # Static files
    location /uploads/ {
        alias /opt/elementmedica/data/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Abilitazione sito
sudo ln -s /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Setup SSL con Let's Encrypt

### 1. Installazione Certbot

```bash
# Installazione Certbot
sudo apt install -y certbot python3-certbot-nginx

# Ottenimento certificato SSL
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test rinnovo automatico
sudo certbot renew --dry-run

# Configurazione rinnovo automatico
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📊 Setup Monitoring

### 1. Installazione Node Exporter

```bash
# Download Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# Creazione utente
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Servizio systemd
sudo tee /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### 2. Setup Log Rotation

```bash
# Configurazione logrotate per ElementMedica
sudo tee /etc/logrotate.d/elementmedica << EOF
/opt/elementmedica/logs/app/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 elementmedica elementmedica
    postrotate
        docker kill -s USR1 \$(docker ps -q --filter name=elementmedica) 2>/dev/null || true
    endscript
}

/opt/elementmedica/logs/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
```

## 🚀 Deploy ElementMedica

### 1. Clone Repository

```bash
# NOTA: Repository GitHub vuota - Deploy da codice locale
# Prepara directory applicazione
cd /opt/elementmedica
mkdir -p app
cd app

# Copia codice da locale (eseguire dal computer locale):
# scp -r ./project-2.0/* user@server-ip:/opt/elementmedica/app/

echo "⚠️ Repository GitHub vuota - Codice deve essere copiato manualmente"
echo "📁 Directory pronta: /opt/elementmedica/app"
```

### 2. Configurazione Environment

```bash
# Copia file environment
cp .env.example .env.production

# Modifica variabili environment
nano .env.production

# Genera segreti sicuri
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.production
```

### 3. Build e Deploy

```bash
# Build immagini Docker
docker compose -f docker-compose.production.yml build

# Start servizi
docker compose -f docker-compose.production.yml up -d

# Verifica servizi
docker compose -f docker-compose.production.yml ps

# Test health check
curl http://localhost:4001/health
curl http://localhost:4003/health
```

## 🔧 Manutenzione Server

### 1. Script Backup Automatico

```bash
# Script backup completo
sudo tee /opt/elementmedica/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/elementmedica/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec elementmedica-postgres pg_dump -U elementmedica_app elementmedica_prod > "$BACKUP_DIR/db_backup_$DATE.sql"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" /opt/elementmedica/data/uploads/

# Backup configurazioni
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" /opt/elementmedica/app/.env.production /etc/nginx/sites-available/elementmedica

# Cleanup backup vecchi (mantieni 7 giorni)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $DATE"
EOF

chmod +x /opt/elementmedica/backup.sh

# Cron job backup giornaliero
echo "0 2 * * * /opt/elementmedica/backup.sh" | crontab -
```

### 2. Script Update Automatico

```bash
# Script update applicazione
sudo tee /opt/elementmedica/update.sh << 'EOF'
#!/bin/bash

set -e

cd /opt/elementmedica/app

echo "🚀 Starting update process..."

# Backup prima dell'update
/opt/elementmedica/backup.sh

# Pull latest changes
git pull origin production

# Rebuild immagini
docker compose -f docker-compose.production.yml build

# Rolling update
docker compose -f docker-compose.production.yml up -d

# Health check
sleep 30
if curl -f http://localhost:4003/health; then
    echo "✅ Update completed successfully"
else
    echo "❌ Health check failed, rolling back..."
    docker compose -f docker-compose.production.yml down
    git reset --hard HEAD~1
    docker compose -f docker-compose.production.yml up -d
    exit 1
fi
EOF

chmod +x /opt/elementmedica/update.sh
```

## 🔍 Troubleshooting

### Comandi Diagnostici

```bash
# Status servizi
sudo systemctl status nginx
sudo systemctl status docker
docker compose -f docker-compose.production.yml ps

# Log servizi
sudo journalctl -u nginx -f
docker compose -f docker-compose.production.yml logs -f

# Risorse sistema
htop
df -h
free -h

# Connessioni rete
sudo netstat -tlnp
sudo ss -tlnp

# Test connettività
curl -I http://localhost
curl -I https://your-domain.com
```

### Problemi Comuni

**1. Servizio non raggiungibile**
```bash
# Verifica firewall
sudo ufw status

# Verifica porte
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Test locale
curl http://localhost:4003/health
```

**2. SSL non funzionante**
```bash
# Verifica certificato
sudo certbot certificates

# Test SSL
openssl s_client -connect your-domain.com:443

# Rinnovo manuale
sudo certbot renew
```

**3. Performance lente**
```bash
# Verifica risorse
top
iostat 1

# Log Docker
docker stats
docker compose -f docker-compose.production.yml logs --tail=100
```

## 📋 Checklist Setup Server

- [ ] **Server cloud creato** (DigitalOcean/AWS)
- [ ] **SSH configurato e testato**
- [ ] **Firewall configurato**
- [ ] **Fail2Ban attivato**
- [ ] **Docker installato**
- [ ] **Directory structure creata**
- [ ] **Nginx installato e configurato**
- [ ] **SSL certificato ottenuto**
- [ ] **Repository clonato**
- [ ] **Environment configurato**
- [ ] **Applicazione deployata**
- [ ] **Health check passati**
- [ ] **Backup automatico configurato**
- [ ] **Monitoring attivato**
- [ ] **Log rotation configurato**
- [ ] **Update script creato**

## 🎯 Prossimi Passi

1. **Scegliere provider** (DigitalOcean consigliato)
2. **Creare server** seguendo configurazioni sopra
3. **Configurare DNS** per puntare al server
4. **Ottenere certificato SSL**
5. **Deployare applicazione**
6. **Configurare monitoring**
7. **Testare backup e recovery**

---

**Nota**: Conservare sempre le chiavi SSH e credenziali in modo sicuro. Non condividere mai chiavi private.