# 🌐 Domain & SSL Setup - ElementMedica 2.0

## Panoramica

Questa guida fornisce istruzioni dettagliate per configurare dominio e certificati SSL per ElementMedica 2.0, con opzioni per diversi provider DNS e configurazioni avanzate.

## 🎯 Opzioni Provider DNS

### Opzione 1: Cloudflare (CONSIGLIATA)

#### Vantaggi
- ✅ CDN globale gratuito
- ✅ Protezione DDoS inclusa
- ✅ SSL/TLS flessibile
- ✅ Analytics avanzate
- ✅ Page Rules gratuite
- ✅ API completa
- ✅ Caching intelligente

#### Setup Cloudflare

**1. Registrazione e Configurazione**
```bash
# Installazione Cloudflare CLI
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
sudo mv cloudflared /usr/local/bin/
sudo chmod +x /usr/local/bin/cloudflared

# Login Cloudflare
cloudflared tunnel login
```

**2. Configurazione DNS Records**
```bash
# Via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "elementmedica.com",
    "content": "YOUR_SERVER_IP",
    "ttl": 1,
    "proxied": true
  }'

# Record WWW
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "www",
    "content": "elementmedica.com",
    "ttl": 1,
    "proxied": true
  }'
```

**3. Configurazioni Cloudflare Ottimali**
```javascript
// Page Rules (via dashboard)
// Rule 1: Redirect www to non-www
// Pattern: www.elementmedica.com/*
// Setting: Forwarding URL (301 - Permanent Redirect)
// Destination: https://elementmedica.com/$1

// Rule 2: Cache API responses
// Pattern: elementmedica.com/api/v1/public/*
// Settings: 
//   - Cache Level: Cache Everything
//   - Edge Cache TTL: 1 hour
//   - Browser Cache TTL: 4 hours

// Rule 3: Security for admin
// Pattern: elementmedica.com/admin/*
// Settings:
//   - Security Level: High
//   - Cache Level: Bypass
//   - Disable Apps
```

### Opzione 2: Route 53 (AWS)

#### Vantaggi
- ✅ Integrazione AWS completa
- ✅ Health checks avanzati
- ✅ Geolocation routing
- ✅ Failover automatico
- ✅ SLA 100% uptime

#### Setup Route 53

**1. Creazione Hosted Zone**
```bash
# Creazione hosted zone
aws route53 create-hosted-zone \
  --name elementmedica.com \
  --caller-reference $(date +%s)

# Ottenimento name servers
aws route53 get-hosted-zone --id /hostedzone/Z123456789
```

**2. Configurazione DNS Records**
```bash
# Record A per dominio principale
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "elementmedica.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_SERVER_IP"}]
      }
    }]
  }'

# Record CNAME per www
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.elementmedica.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "elementmedica.com"}]
      }
    }]
  }'
```

## 🔒 Configurazione SSL/TLS

### Opzione 1: Let's Encrypt (CONSIGLIATA)

#### Vantaggi
- ✅ Completamente gratuito
- ✅ Rinnovo automatico
- ✅ Supporto wildcard
- ✅ Riconosciuto universalmente
- ✅ Integrazione semplice

#### Setup Let's Encrypt

**1. Installazione Certbot**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx

# Via Snap (universale)
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

**2. Ottenimento Certificato**
```bash
# Certificato singolo dominio
sudo certbot --nginx -d elementmedica.com -d www.elementmedica.com

# Certificato wildcard (richiede DNS challenge)
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d elementmedica.com \
  -d *.elementmedica.com

# Con Cloudflare DNS plugin
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  -d elementmedica.com \
  -d *.elementmedica.com
```

**3. Configurazione Cloudflare DNS Plugin**
```bash
# Installazione plugin
sudo pip3 install certbot-dns-cloudflare

# Creazione file credenziali
sudo mkdir -p ~/.secrets/certbot
sudo tee ~/.secrets/certbot/cloudflare.ini << EOF
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
sudo chmod 600 ~/.secrets/certbot/cloudflare.ini
```

**4. Rinnovo Automatico**
```bash
# Test rinnovo
sudo certbot renew --dry-run

# Cron job per rinnovo automatico
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Systemd timer (alternativa)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Opzione 2: Cloudflare SSL

#### Configurazione Cloudflare SSL

**1. SSL/TLS Mode**
```bash
# Via API - Impostazione Full (strict)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/ssl" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"full"}'
```

**2. Edge Certificates**
```bash
# Abilitazione Universal SSL
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/universal_ssl" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'

# Abilitazione Always Use HTTPS
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/ZONE_ID/settings/always_use_https" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}'
```

## 🔧 Configurazione Nginx SSL

### 1. Configurazione SSL Ottimale

```nginx
# /etc/nginx/sites-available/elementmedica
server {
    listen 80;
    server_name elementmedica.com www.elementmedica.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://elementmedica.com$request_uri;
}

# Redirect www to non-www
server {
    listen 443 ssl http2;
    server_name www.elementmedica.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/elementmedica.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementmedica.com/privkey.pem;
    
    return 301 https://elementmedica.com$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    server_name elementmedica.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/elementmedica.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elementmedica.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/elementmedica.com/chain.pem;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
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
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://elementmedica.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://elementmedica.com";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Login endpoint with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health checks (no rate limiting)
    location /health {
        proxy_pass http://localhost:4003/health;
        access_log off;
    }
    
    # Static uploads
    location /uploads/ {
        alias /opt/elementmedica/data/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security for uploads
        location ~* \.(php|php5|phtml|pl|py|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }
    
    # Admin area (additional security)
    location /admin {
        # IP whitelist (optional)
        # allow 192.168.1.0/24;
        # deny all;
        
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Block common attack patterns
    location ~* /(wp-admin|wp-login|xmlrpc|phpmyadmin) {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Block hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 2. Test Configurazione SSL

```bash
# Test configurazione Nginx
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test SSL
openssl s_client -connect elementmedica.com:443 -servername elementmedica.com

# Test con curl
curl -I https://elementmedica.com

# Test redirect
curl -I http://elementmedica.com
curl -I https://www.elementmedica.com
```

## 🔍 Verifica e Testing

### 1. Test SSL/TLS

```bash
# SSL Labs Test (online)
# https://www.ssllabs.com/ssltest/analyze.html?d=elementmedica.com

# Test locale con testssl.sh
wget https://testssl.sh/testssl.sh
chmod +x testssl.sh
./testssl.sh https://elementmedica.com

# Test con nmap
nmap --script ssl-enum-ciphers -p 443 elementmedica.com
```

### 2. Test Performance

```bash
# Test velocità DNS
dig elementmedica.com
nslookup elementmedica.com

# Test tempo risposta
curl -w "@curl-format.txt" -o /dev/null -s https://elementmedica.com

# File curl-format.txt
echo '
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n' > curl-format.txt
```

### 3. Test Sicurezza

```bash
# Test headers sicurezza
curl -I https://elementmedica.com | grep -E "(Strict-Transport|X-Frame|X-Content|X-XSS|Content-Security)"

# Test HSTS
curl -I https://elementmedica.com | grep "Strict-Transport-Security"

# Test redirect
curl -I http://elementmedica.com 2>&1 | grep "Location:"
curl -I https://www.elementmedica.com 2>&1 | grep "Location:"
```

## 📊 Monitoring DNS e SSL

### 1. Script Monitoring

```bash
#!/bin/bash
# monitor-domain.sh

DOMAIN="elementmedica.com"
EMAIL="admin@elementmedica.com"
LOG_FILE="/var/log/domain-monitor.log"

# Funzione log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Test DNS
if ! dig +short $DOMAIN > /dev/null; then
    log "❌ DNS resolution failed for $DOMAIN"
    echo "DNS resolution failed for $DOMAIN" | mail -s "DNS Alert" $EMAIL
else
    log "✅ DNS resolution OK for $DOMAIN"
fi

# Test SSL expiry
SSL_EXPIRY=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    log "⚠️ SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    echo "SSL certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days" | mail -s "SSL Expiry Alert" $EMAIL
else
    log "✅ SSL certificate valid for $DAYS_UNTIL_EXPIRY days"
fi

# Test HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$HTTP_CODE" != "200" ]; then
    log "❌ HTTP response code: $HTTP_CODE"
    echo "HTTP response code $HTTP_CODE for $DOMAIN" | mail -s "HTTP Alert" $EMAIL
else
    log "✅ HTTP response OK: $HTTP_CODE"
fi
```

### 2. Cron Job Monitoring

```bash
# Aggiungere al crontab
echo "*/15 * * * * /opt/elementmedica/monitor-domain.sh" | crontab -

# Log rotation per monitoring
sudo tee /etc/logrotate.d/domain-monitor << EOF
/var/log/domain-monitor.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

## 🚀 Automazione Deploy

### 1. Script Deploy Completo

```bash
#!/bin/bash
# deploy-domain-ssl.sh

set -e

DOMAIN="elementmedica.com"
EMAIL="admin@elementmedica.com"

echo "🚀 Starting domain and SSL setup for $DOMAIN"

# 1. Update Nginx configuration
echo "📝 Updating Nginx configuration..."
sudo cp /opt/elementmedica/nginx.conf /etc/nginx/sites-available/elementmedica
sudo ln -sf /etc/nginx/sites-available/elementmedica /etc/nginx/sites-enabled/
sudo nginx -t

# 2. Obtain SSL certificate
echo "🔒 Obtaining SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# 3. Test SSL
echo "🧪 Testing SSL configuration..."
sleep 10
if curl -f https://$DOMAIN > /dev/null 2>&1; then
    echo "✅ SSL test passed"
else
    echo "❌ SSL test failed"
    exit 1
fi

# 4. Setup monitoring
echo "📊 Setting up monitoring..."
cp /opt/elementmedica/monitor-domain.sh /opt/elementmedica/
chmod +x /opt/elementmedica/monitor-domain.sh
echo "*/15 * * * * /opt/elementmedica/monitor-domain.sh" | crontab -

# 5. Test complete setup
echo "🔍 Running final tests..."
curl -I http://$DOMAIN 2>&1 | grep -q "301" && echo "✅ HTTP redirect OK"
curl -I https://www.$DOMAIN 2>&1 | grep -q "301" && echo "✅ WWW redirect OK"
curl -f https://$DOMAIN > /dev/null && echo "✅ HTTPS OK"

echo "🎉 Domain and SSL setup completed successfully!"
echo "📋 Next steps:"
echo "   1. Update DNS records to point to this server"
echo "   2. Test from external locations"
echo "   3. Configure Cloudflare (if using)"
echo "   4. Run SSL Labs test"
```

## 📋 Checklist Domain & SSL

- [ ] **Dominio registrato**
- [ ] **DNS configurato** (A record, CNAME)
- [ ] **Cloudflare configurato** (se utilizzato)
- [ ] **Nginx configurato** per SSL
- [ ] **Certificato SSL ottenuto**
- [ ] **Redirect HTTP→HTTPS** funzionante
- [ ] **Redirect WWW→non-WWW** funzionante
- [ ] **Security headers** configurati
- [ ] **Rate limiting** attivato
- [ ] **HSTS** abilitato
- [ ] **SSL Labs test** passato (A+)
- [ ] **Monitoring** configurato
- [ ] **Rinnovo automatico** SSL testato
- [ ] **Backup configurazione** creato

## 🎯 Prossimi Passi

1. **Registrare dominio** o configurare DNS
2. **Scegliere provider DNS** (Cloudflare consigliato)
3. **Configurare record DNS**
4. **Ottenere certificato SSL**
5. **Configurare Nginx**
6. **Testare configurazione**
7. **Attivare monitoring**
8. **Documentare configurazione**

---

**Nota**: Conservare sempre i backup delle configurazioni e testare i certificati SSL prima della scadenza.