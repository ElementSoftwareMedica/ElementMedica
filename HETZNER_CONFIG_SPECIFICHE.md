# 🔧 Configurazione Specifica Server Hetzner

## 📋 Specifiche Esatte per Creazione Server

### 🖥️ Configurazione Server Hetzner Cloud Console

```yaml
# === CONFIGURAZIONE SERVER ===
Nome Server: elementmedica-prod-01
Tipo Server: CX11 (Shared vCPU)
Prezzo: €3.29/mese

# === SPECIFICHE HARDWARE ===
CPU: 1 vCPU AMD EPYC
RAM: 2 GB DDR4
Storage: 20 GB NVMe SSD
Traffico: 20 TB/mese inclusi
Rete: 1 Gbit/s
IPv4: 1 indirizzo pubblico incluso
IPv6: /64 subnet incluso

# === SISTEMA OPERATIVO ===
Immagine: Ubuntu 22.04 LTS (x64)
Architettura: x86_64
Kernel: Linux 5.15+

# === DATACENTER RACCOMANDATO ===
Primario: Nuremberg (nbg1-dc3)
Alternativo: Helsinki (hel1-dc2)
Motivo: Latenza ottimale per Europa, conformità GDPR
```

## 🔑 SSH Key Generata per il Progetto

### Chiave Pubblica da Aggiungere su Hetzner
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFo0py3Gu9Vpp9Zg0nrVzCDC3ReR8B9SLn7Bu/YZIdzp elementmedica-hetzner-20250818
```

### Configurazione SSH Key su Hetzner Console
```yaml
Nome SSH Key: elementmedica-production-key
Tipo: ED25519
Fingerprint: SHA256:xdUCC3WeAfoOxmfH+HOu1YuiZgMpKeReDzquf8XzOmo
Descrizione: "ElementMedica 2.0 Production Server Access Key"
```

### File SSH Key Locali (sul tuo Mac)
```bash
# Chiave privata (MANTIENI SEGRETA)
~/.ssh/elementmedica_hetzner

# Chiave pubblica (da aggiungere su Hetzner)
~/.ssh/elementmedica_hetzner.pub
```

## 🔥 Configurazione Firewall Hetzner

### Regole Firewall da Creare
```yaml
Nome Firewall: elementmedica-security-rules

# === REGOLE INBOUND ===
Regola 1 - SSH Admin:
  Protocollo: TCP
  Porta: 22
  Sorgente: [IL_TUO_IP_PUBBLICO]/32
  Descrizione: "SSH access from admin IP only"

Regola 2 - HTTP Public:
  Protocollo: TCP  
  Porta: 80
  Sorgente: 0.0.0.0/0
  Descrizione: "HTTP public access"

Regola 3 - HTTPS Public:
  Protocollo: TCP
  Porta: 443
  Sorgente: 0.0.0.0/0
  Descrizione: "HTTPS public access"

Regola 4 - Monitoring Admin:
  Protocollo: TCP
  Porta: 9090
  Sorgente: [IL_TUO_IP_PUBBLICO]/32
  Descrizione: "Prometheus monitoring access"

# === REGOLE OUTBOUND ===
Regola 1 - All Outbound:
  Protocollo: Any
  Porta: Any
  Destinazione: 0.0.0.0/0
  Descrizione: "Allow all outbound traffic"
```

## 🌐 Configurazione Rete e DNS

### Configurazione IP e Rete
```yaml
# === CONFIGURAZIONE IP ===
IPv4 Pubblico: [ASSEGNATO_DA_HETZNER]
IPv6: [ASSEGNATO_DA_HETZNER]/64
Gateway IPv4: [GATEWAY_HETZNER]
DNS Primario: 1.1.1.1 (Cloudflare)
DNS Secondario: 8.8.8.8 (Google)

# === CONFIGURAZIONE HOSTNAME ===
Hostname: elementmedica-prod
FQDN: elementmedica-prod.tuodominio.com
```

### Record DNS da Configurare su Cloudflare
```yaml
# === RECORD A ===
Tipo: A
Nome: @
Contenuto: [IP_SERVER_HETZNER]
TTL: Auto
Proxy: ✅ Abilitato (nuvola arancione)

Tipo: A
Nome: www
Contenuto: [IP_SERVER_HETZNER]  
TTL: Auto
Proxy: ✅ Abilitato (nuvola arancione)

# === RECORD CNAME (Opzionali) ===
Tipo: CNAME
Nome: api
Contenuto: tuodominio.com
TTL: Auto
Proxy: ✅ Abilitato

Tipo: CNAME
Nome: admin
Contenuto: tuodominio.com
TTL: Auto
Proxy: ✅ Abilitato
```

## 💾 Configurazione Backup Hetzner

### Backup Automatici Hetzner
```yaml
# === CONFIGURAZIONE BACKUP ===
Backup Automatici: ✅ Abilitato
Frequenza: Giornaliera
Orario: 02:00 UTC (04:00 ora italiana)
Retention: 7 backup (1 settimana)
Costo: €0.66/mese (20% del costo server)

# === SNAPSHOT MANUALI ===
Snapshot Pre-Deploy: Raccomandato prima di ogni deploy
Snapshot Post-Setup: Dopo configurazione iniziale
Costo Snapshot: €0.0119/GB/mese
```

## 🔧 Configurazione Avanzata Server

### Limiti e Quote Sistema
```yaml
# === LIMITI MEMORIA (2GB RAM) ===
Kernel Memory: 1.8GB disponibili
User Space: ~1.6GB utilizzabili
Swap File: 2GB (da creare)
Swap Swappiness: 10 (basso utilizzo)

# === LIMITI STORAGE (20GB SSD) ===
Root Partition: 18GB disponibili
Swap File: 2GB
Logs: Max 1GB
Backups Locali: Max 2GB
Applicazione: ~10GB
Sistema: ~3GB

# === LIMITI RETE ===
Bandwidth: 1 Gbit/s
Traffico Incluso: 20TB/mese
Traffico Extra: €1.19/TB
```

### Ottimizzazioni Sistema Ubuntu 22.04
```bash
# === KERNEL PARAMETERS ===
vm.swappiness=10
vm.vfs_cache_pressure=50
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216

# === SYSTEMD LIMITS ===
DefaultLimitNOFILE=65536
DefaultLimitNPROC=32768
DefaultLimitMEMLOCK=infinity

# === NGINX WORKER PROCESSES ===
worker_processes: 1 (per 1 vCPU)
worker_connections: 1024
worker_rlimit_nofile: 2048
```

## 📊 Monitoraggio e Metriche

### Soglie di Allerta Raccomandate
```yaml
# === MEMORIA ===
Warning: >80% utilizzo RAM
Critical: >90% utilizzo RAM
Swap Warning: >50% utilizzo swap
Swap Critical: >80% utilizzo swap

# === CPU ===
Warning: Load average >1.5 (per 1 vCPU)
Critical: Load average >2.0
CPU Warning: >80% utilizzo medio 5min
CPU Critical: >95% utilizzo medio 5min

# === STORAGE ===
Warning: >80% utilizzo disco
Critical: >90% utilizzo disco
Inode Warning: >80% utilizzo inode
Inode Critical: >90% utilizzo inode

# === RETE ===
Warning: >80% bandwidth utilizzo
Critical: >95% bandwidth utilizzo
Packet Loss Warning: >1%
Packet Loss Critical: >5%
```

### UptimeRobot Monitor da Configurare
```yaml
# === MONITOR 1 - UPTIME ===
Tipo: HTTP(s)
URL: https://tuodominio.com/health
Nome: ElementMedica Proxy Health
Intervallo: 5 minuti
Timeout: 30 secondi
Keyword: "status"

# === MONITOR 2 - API ===
Tipo: HTTP(s)
URL: https://tuodominio.com/api/health
Nome: ElementMedica API Health  
Intervallo: 5 minuti
Timeout: 30 secondi
Keyword: "healthy"

# === MONITOR 3 - PING ===
Tipo: Ping
Target: [IP_SERVER_HETZNER]
Nome: ElementMedica Server Ping
Intervallo: 5 minuti
Timeout: 30 secondi

# === MONITOR 4 - SSL ===
Tipo: HTTP(s)
URL: https://tuodominio.com
Nome: ElementMedica SSL Certificate
Intervallo: 1 giorno
SSL Check: ✅ Abilitato
```

## 🚀 Procedura di Deploy Step-by-Step

### 1. Creazione Server (5 minuti)
```bash
1. Accedi a https://console.hetzner.cloud/
2. Crea nuovo progetto "ElementMedica-Production"
3. Clicca "Add Server"
4. Seleziona:
   - Location: Nuremberg (nbg1)
   - Image: Ubuntu 22.04 LTS
   - Type: CX11 (€3.29/mese)
   - SSH Key: [Aggiungi chiave pubblica sopra]
   - Firewall: [Crea nuovo con regole sopra]
   - Backups: ✅ Abilitato
   - Name: elementmedica-prod-01
5. Clicca "Create & Buy Now"
```

### 2. Primo Accesso (2 minuti)
```bash
# Attendi che il server sia "Running"
# Copia l'IP pubblico assegnato
ssh -i ~/.ssh/elementmedica_hetzner root@[IP_SERVER]
```

### 3. Setup Automatico (15 minuti)
```bash
# Sul server, esegui:
wget https://raw.githubusercontent.com/elementmedica/elementmedica-2.0/main/scripts/startup-setup.sh
chmod +x startup-setup.sh
sudo ./startup-setup.sh
```

### 4. Configurazione DNS (5 minuti)
```bash
# Su Cloudflare Dashboard:
1. Aggiungi dominio se non presente
2. Crea record A: @ -> [IP_SERVER]
3. Crea record A: www -> [IP_SERVER]  
4. Abilita proxy (nuvola arancione)
5. Attendi propagazione DNS (5-10 minuti)
```

### 5. Deploy Applicazione (10 minuti)
```bash
# Sul server come utente elementmedica:
su - elementmedica
git clone https://github.com/elementmedica/elementmedica-2.0.git app
cd app
cp .env.example .env
nano .env  # Configura variabili ambiente
./scripts/deploy-startup.sh
```

### 6. Configurazione SSL (3 minuti)
```bash
# Sul server come root:
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com
sudo certbot renew --dry-run
```

### 7. Verifica Finale (2 minuti)
```bash
# Dal tuo Mac:
./scripts/hetzner-verify.sh [IP_SERVER] tuodominio.com
```

## 📞 Informazioni di Supporto

### 🔑 Credenziali e Accessi
```yaml
# === HETZNER ===
Console: https://console.hetzner.cloud/
Progetto: ElementMedica-Production
Server: elementmedica-prod-01
IP: [DA_ASSEGNARE]

# === SSH ===
User: elementmedica
Key: ~/.ssh/elementmedica_hetzner
Command: ssh -i ~/.ssh/elementmedica_hetzner elementmedica@[IP]

# === APPLICAZIONE ===
URL: https://tuodominio.com
Admin: admin@example.com / Admin123!
Health: https://tuodominio.com/health
API Health: https://tuodominio.com/api/health
```

### 📋 Checklist Finale
- [ ] Server Hetzner CX11 creato e attivo
- [ ] SSH key configurata e funzionante  
- [ ] Firewall Hetzner configurato
- [ ] Backup automatici abilitati
- [ ] DNS Cloudflare configurato
- [ ] SSL Let's Encrypt installato
- [ ] Applicazione deployata e funzionante
- [ ] Monitoring UptimeRobot configurato
- [ ] Script di verifica eseguito con successo

---

## 🎯 Riepilogo Costi Finali

**Costo Mensile Totale: €4.78**
- Hetzner CX11: €3.29/mese
- Hetzner Backup: €0.66/mese  
- Dominio (Namecheap): €0.83/mese (€10/anno)
- Supabase: €0.00/mese (Free Tier)
- Cloudflare: €0.00/mese (Free Tier)
- UptimeRobot: €0.00/mese (Free Tier)
- Let's Encrypt: €0.00/mese (Gratuito)

**ElementMedica 2.0 pronto per il lancio!** 🚀

---

*Configurazione creata il: $(date)*  
*Versione: 1.0*  
*Target: Hetzner CX11 + Ubuntu 22.04*  
*Budget: €4.78/mese*