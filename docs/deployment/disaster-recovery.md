# 🚨 Disaster Recovery

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa guida definisce le procedure di disaster recovery per garantire la continuità operativa del sistema unificato Person in caso di emergenze, guasti critici o eventi catastrofici, mantenendo la compliance GDPR.

## 📊 Analisi dei Rischi

### Classificazione Scenari di Disaster

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LIVELLO 1     │    │   LIVELLO 2     │    │   LIVELLO 3     │
│   Minore        │    │   Moderato      │    │   Critico       │
│                 │    │                 │    │                 │
│ • Server singolo│    │ • Database down │    │ • Datacenter    │
│ • Servizio down │    │ • Corruzione DB │    │ • Infrastruttura│
│ • Errore config │    │ • Perdita dati  │    │ • Cyber attack  │
│ • Bug software  │    │ • Network fail  │    │ • Disaster nat. │
│                 │    │                 │    │                 │
│ RTO: 15 min     │    │ RTO: 2 ore      │    │ RTO: 24 ore     │
│ RPO: 4 ore      │    │ RPO: 1 ora      │    │ RPO: 1 ora      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Obiettivi di Recovery

- **RTO (Recovery Time Objective)**: Tempo massimo di downtime accettabile
- **RPO (Recovery Point Objective)**: Perdita massima di dati accettabile
- **MTTR (Mean Time To Recovery)**: Tempo medio di ripristino
- **MTBF (Mean Time Between Failures)**: Tempo medio tra guasti

## 🏗️ Architettura di Recovery

### Componenti Critici

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA PRIMARIO                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   API Server    │ Documents Server│    Proxy Server         │
│   (Primario)    │   (Primario)    │    (Primario)           │
│                 │                 │                         │
│ • Person API    │ • PDF Generator │ • Load Balancer         │
│ • GDPR Endpoints│ • File Storage  │ • SSL Termination       │
│ • Auth System   │ • Templates     │ • Request Routing       │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE CLUSTER                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Primary DB    │   Replica DB    │    Backup Storage       │
│   (Master)      │   (Standby)     │    (Offsite)            │
│                 │                 │                         │
│ • Read/Write    │ • Read Only     │ • Daily Backups         │
│ • Real-time     │ • Sync Replica  │ • Point-in-time         │
│ • GDPR Audit    │ • Failover Ready│ • Encrypted Storage     │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  RECOVERY INFRASTRUCTURE                   │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Monitoring     │  Alerting       │   Recovery Scripts      │
│  (24/7)         │  (Multi-channel)│   (Automated)           │
│                 │                 │                         │
│ • Health Checks │ • Email/SMS     │ • Auto Failover         │
│ • Performance   │ • Slack/Teams   │ • Manual Procedures     │
│ • GDPR Compliance│ • Dashboard    │ • Rollback Scripts      │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🚨 Procedure di Emergenza

### 1. Rilevamento Automatico

Creare `scripts/disaster-detection.sh`:

```bash
#!/bin/bash

# Sistema di rilevamento disaster automatico
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/disaster-detection.log"
ALERT_FILE="./logs/disaster-alerts.log"

# Configurazione soglie critiche
CPU_CRITICAL_THRESHOLD=90
MEMORY_CRITICAL_THRESHOLD=95
DISK_CRITICAL_THRESHOLD=95
DB_CONNECTION_TIMEOUT=10
API_RESPONSE_TIMEOUT=30
MAX_CONSECUTIVE_FAILURES=3

# Contatori per failure consecutivi
API_FAILURES=0
DB_FAILURES=0
DOCS_FAILURES=0
PROXY_FAILURES=0

# Colori per output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "[$TIMESTAMP] === DISASTER DETECTION AVVIATO ===" >> $LOG_FILE

# Funzione per inviare alert
send_alert() {
    local severity=$1
    local component=$2
    local message=$3
    local alert_timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "[$alert_timestamp] [$severity] $component: $message" >> $ALERT_FILE
    
    # Invio notifica (configurare secondo necessità)
    if [ "$severity" = "CRITICAL" ]; then
        echo "🚨 CRITICAL ALERT: $component - $message" | tee -a $LOG_FILE
        
        # Qui aggiungere invio email/SMS/Slack
        # curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"🚨 CRITICAL: $component - $message\"}"
        # echo "$message" | mail -s "CRITICAL: $component" "$ADMIN_EMAIL"
    elif [ "$severity" = "WARNING" ]; then
        echo "⚠️ WARNING: $component - $message" | tee -a $LOG_FILE
    fi
}

# Verifica risorse sistema
check_system_resources() {
    echo "🔍 Controllo risorse sistema..."
    
    # CPU Usage
    cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' | cut -d'.' -f1)
    if [ "$cpu_usage" -gt $CPU_CRITICAL_THRESHOLD ]; then
        send_alert "CRITICAL" "SYSTEM" "CPU usage critico: ${cpu_usage}%"
        return 1
    elif [ "$cpu_usage" -gt 80 ]; then
        send_alert "WARNING" "SYSTEM" "CPU usage elevato: ${cpu_usage}%"
    fi
    
    # Memory Usage
    memory_usage=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    total_memory=$(sysctl -n hw.memsize)
    memory_percent=$(echo "scale=0; (($total_memory - $memory_usage * 4096) * 100) / $total_memory" | bc)
    
    if [ "$memory_percent" -gt $MEMORY_CRITICAL_THRESHOLD ]; then
        send_alert "CRITICAL" "SYSTEM" "Memoria critica: ${memory_percent}%"
        return 1
    elif [ "$memory_percent" -gt 85 ]; then
        send_alert "WARNING" "SYSTEM" "Memoria elevata: ${memory_percent}%"
    fi
    
    # Disk Usage
    disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt $DISK_CRITICAL_THRESHOLD ]; then
        send_alert "CRITICAL" "SYSTEM" "Spazio disco critico: ${disk_usage}%"
        return 1
    elif [ "$disk_usage" -gt 85 ]; then
        send_alert "WARNING" "SYSTEM" "Spazio disco elevato: ${disk_usage}%"
    fi
    
    return 0
}

# Verifica database
check_database() {
    echo "🗄️ Controllo database..."
    
    # Test connessione database
    if timeout $DB_CONNECTION_TIMEOUT psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        # Test query performance
        query_time=$(time (psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM person;" > /dev/null 2>&1) 2>&1 | grep real | awk '{print $2}' | sed 's/[^0-9.]//g')
        
        if (( $(echo "$query_time > 5.0" | bc -l) )); then
            send_alert "WARNING" "DATABASE" "Query lente rilevate: ${query_time}s"
        fi
        
        DB_FAILURES=0
        return 0
    else
        DB_FAILURES=$((DB_FAILURES + 1))
        
        if [ $DB_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
            send_alert "CRITICAL" "DATABASE" "Database non raggiungibile ($DB_FAILURES tentativi consecutivi)"
            return 1
        else
            send_alert "WARNING" "DATABASE" "Database non raggiungibile (tentativo $DB_FAILURES)"
            return 1
        fi
    fi
}

# Verifica API Server
check_api_server() {
    echo "🔌 Controllo API Server..."
    
    # Test endpoint health
    if timeout $API_RESPONSE_TIMEOUT curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
        # Test endpoint critico
        if timeout $API_RESPONSE_TIMEOUT curl -s "http://localhost:3000/api/person" > /dev/null 2>&1; then
            API_FAILURES=0
            return 0
        else
            API_FAILURES=$((API_FAILURES + 1))
            send_alert "WARNING" "API" "Endpoint /api/person non risponde (tentativo $API_FAILURES)"
            return 1
        fi
    else
        API_FAILURES=$((API_FAILURES + 1))
        
        if [ $API_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
            send_alert "CRITICAL" "API" "API Server non raggiungibile ($API_FAILURES tentativi consecutivi)"
            return 1
        else
            send_alert "WARNING" "API" "API Server non raggiungibile (tentativo $API_FAILURES)"
            return 1
        fi
    fi
}

# Verifica Documents Server
check_documents_server() {
    echo "📄 Controllo Documents Server..."
    
    if timeout $API_RESPONSE_TIMEOUT curl -s "http://localhost:3001/health" > /dev/null 2>&1; then
        DOCS_FAILURES=0
        return 0
    else
        DOCS_FAILURES=$((DOCS_FAILURES + 1))
        
        if [ $DOCS_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
            send_alert "CRITICAL" "DOCUMENTS" "Documents Server non raggiungibile ($DOCS_FAILURES tentativi consecutivi)"
            return 1
        else
            send_alert "WARNING" "DOCUMENTS" "Documents Server non raggiungibile (tentativo $DOCS_FAILURES)"
            return 1
        fi
    fi
}

# Verifica Proxy Server
check_proxy_server() {
    echo "🔀 Controllo Proxy Server..."
    
    if timeout $API_RESPONSE_TIMEOUT curl -s "http://localhost:3002/health" > /dev/null 2>&1; then
        PROXY_FAILURES=0
        return 0
    else
        PROXY_FAILURES=$((PROXY_FAILURES + 1))
        
        if [ $PROXY_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
            send_alert "CRITICAL" "PROXY" "Proxy Server non raggiungibile ($PROXY_FAILURES tentativi consecutivi)"
            return 1
        else
            send_alert "WARNING" "PROXY" "Proxy Server non raggiungibile (tentativo $PROXY_FAILURES)"
            return 1
        fi
    fi
}

# Verifica GDPR Compliance
check_gdpr_compliance() {
    echo "🔒 Controllo GDPR Compliance..."
    
    # Verifica audit log recenti
    recent_audits=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM gdpr_audit_log WHERE created_at >= NOW() - INTERVAL '1 hour';" 2>/dev/null | tr -d ' ')
    
    if [ -z "$recent_audits" ] || [ "$recent_audits" -eq 0 ]; then
        send_alert "WARNING" "GDPR" "Nessun audit log nelle ultime ore"
        return 1
    fi
    
    # Verifica consent records
    consent_errors=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM consent_record WHERE status = 'error' AND updated_at >= NOW() - INTERVAL '1 hour';" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$consent_errors" ] && [ "$consent_errors" -gt 0 ]; then
        send_alert "CRITICAL" "GDPR" "Errori consent rilevati: $consent_errors"
        return 1
    fi
    
    return 0
}

# Esecuzione controlli
echo "🚨 Avvio controlli disaster detection..."

system_status=0
db_status=0
api_status=0
docs_status=0
proxy_status=0
gdpr_status=0

# Esecuzione controlli in parallelo per velocità
check_system_resources &
system_pid=$!

check_database &
db_pid=$!

check_api_server &
api_pid=$!

check_documents_server &
docs_pid=$!

check_proxy_server &
proxy_pid=$!

check_gdpr_compliance &
gdpr_pid=$!

# Attesa completamento controlli
wait $system_pid; system_status=$?
wait $db_pid; db_status=$?
wait $api_pid; api_status=$?
wait $docs_pid; docs_status=$?
wait $proxy_pid; proxy_status=$?
wait $gdpr_pid; gdpr_status=$?

# Calcolo stato generale
total_failures=$((system_status + db_status + api_status + docs_status + proxy_status + gdpr_status))

echo
echo "📊 Risultati controlli:"
echo "   • Sistema: $([ $system_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"
echo "   • Database: $([ $db_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"
echo "   • API: $([ $api_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"
echo "   • Documents: $([ $docs_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"
echo "   • Proxy: $([ $proxy_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"
echo "   • GDPR: $([ $gdpr_status -eq 0 ] && echo "✅ OK" || echo "❌ ERRORE")"

if [ $total_failures -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}SISTEMA OPERATIVO - NESSUN PROBLEMA RILEVATO${NC}"
    echo "[$TIMESTAMP] ✅ Disaster detection: sistema operativo" >> $LOG_FILE
elif [ $total_failures -le 2 ]; then
    echo -e "\n⚠️ ${YELLOW}ATTENZIONE - PROBLEMI MINORI RILEVATI${NC}"
    echo "[$TIMESTAMP] ⚠️ Disaster detection: $total_failures problemi minori" >> $LOG_FILE
else
    echo -e "\n🚨 ${RED}EMERGENZA - PROBLEMI CRITICI RILEVATI${NC}"
    echo "[$TIMESTAMP] 🚨 Disaster detection: $total_failures problemi critici" >> $LOG_FILE
    
    # Trigger procedure di emergenza se configurate
    if [ -f "./scripts/emergency-response.sh" ]; then
        echo "🚨 Attivazione procedure di emergenza..."
        ./scripts/emergency-response.sh
    fi
fi

echo "[$TIMESTAMP] === DISASTER DETECTION TERMINATO ===" >> $LOG_FILE

exit $total_failures
```

### 2. Risposta Automatica alle Emergenze

Creare `scripts/emergency-response.sh`:

```bash
#!/bin/bash

# Sistema di risposta automatica alle emergenze
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/emergency-response.log"
EMERGENCY_BACKUP_DIR="./emergency-backups"

echo "[$TIMESTAMP] === RISPOSTA EMERGENZA ATTIVATA ===" | tee -a $LOG_FILE

# Funzioni di recovery automatico
auto_restart_services() {
    echo "🔄 Tentativo restart automatico servizi..."
    
    # Verifica PM2
    if command -v pm2 >/dev/null 2>&1; then
        # Restart solo servizi non funzionanti
        pm2 restart ecosystem.config.js --only api,documents,proxy 2>/dev/null
        
        sleep 10
        
        # Verifica se restart ha risolto
        if ./scripts/disaster-detection.sh > /dev/null 2>&1; then
            echo "✅ Restart automatico riuscito"
            echo "[$TIMESTAMP] ✅ Auto-restart servizi: successo" >> $LOG_FILE
            return 0
        else
            echo "❌ Restart automatico fallito"
            echo "[$TIMESTAMP] ❌ Auto-restart servizi: fallito" >> $LOG_FILE
            return 1
        fi
    else
        echo "❌ PM2 non disponibile per restart"
        return 1
    fi
}

# Backup di emergenza
emergency_backup() {
    echo "💾 Esecuzione backup di emergenza..."
    
    mkdir -p "$EMERGENCY_BACKUP_DIR"
    emergency_file="$EMERGENCY_BACKUP_DIR/emergency_$(date +%Y%m%d_%H%M%S).sql"
    
    # Backup rapido database
    if pg_dump "$DATABASE_URL" > "$emergency_file" 2>/dev/null; then
        gzip "$emergency_file"
        echo "✅ Backup emergenza completato: ${emergency_file}.gz"
        echo "[$TIMESTAMP] ✅ Backup emergenza: ${emergency_file}.gz" >> $LOG_FILE
        return 0
    else
        echo "❌ Backup emergenza fallito"
        echo "[$TIMESTAMP] ❌ Backup emergenza fallito" >> $LOG_FILE
        return 1
    fi
}

# Attivazione modalità manutenzione
activate_maintenance_mode() {
    echo "🚧 Attivazione modalità manutenzione..."
    
    # Creazione file manutenzione
    cat > ./public/maintenance.html << 'EOF'
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manutenzione in Corso</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .container {
            max-width: 600px;
            padding: 2rem;
        }
        .icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            font-weight: 300;
        }
        p {
            font-size: 1.2rem;
            line-height: 1.6;
            opacity: 0.9;
        }
        .status {
            background: rgba(255,255,255,0.1);
            padding: 1rem;
            border-radius: 8px;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>Manutenzione in Corso</h1>
        <p>Il sistema è temporaneamente non disponibile per manutenzione programmata.</p>
        <p>Ci scusiamo per l'inconveniente. Il servizio sarà ripristinato il prima possibile.</p>
        <div class="status">
            <strong>Stato:</strong> Manutenzione Attiva<br>
            <strong>Tempo stimato:</strong> 30-60 minuti
        </div>
    </div>
</body>
</html>
EOF
    
    echo "✅ Modalità manutenzione attivata"
    echo "[$TIMESTAMP] ✅ Modalità manutenzione attivata" >> $LOG_FILE
}

# Notifica team di emergenza
notify_emergency_team() {
    echo "📢 Notifica team di emergenza..."
    
    # Qui configurare notifiche reali
    # Esempi:
    # curl -X POST "$SLACK_EMERGENCY_WEBHOOK" -d "{\"text\":\"🚨 EMERGENZA SISTEMA ATTIVATA\"}"
    # echo "Emergenza sistema attivata" | mail -s "EMERGENZA SISTEMA" "$EMERGENCY_EMAIL"
    
    echo "[$TIMESTAMP] 📢 Team emergenza notificato" >> $LOG_FILE
}

# Esecuzione procedure di emergenza
echo "🚨 Esecuzione procedure di emergenza..."

# 1. Backup di emergenza
emergency_backup

# 2. Tentativo restart automatico
if auto_restart_services; then
    echo "🎉 Emergenza risolta automaticamente"
    echo "[$TIMESTAMP] 🎉 Emergenza risolta con auto-restart" >> $LOG_FILE
    exit 0
fi

# 3. Attivazione modalità manutenzione
activate_maintenance_mode

# 4. Notifica team
notify_emergency_team

echo "⚠️ Emergenza non risolta automaticamente - intervento manuale richiesto"
echo "[$TIMESTAMP] ⚠️ Emergenza richiede intervento manuale" >> $LOG_FILE

echo "[$TIMESTAMP] === RISPOSTA EMERGENZA TERMINATA ===" >> $LOG_FILE

exit 1
```

## 🔄 Procedure di Failover

### 1. Database Failover

Creare `scripts/database-failover.sh`:

```bash
#!/bin/bash

# Procedura failover database
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/database-failover.log"

echo "[$TIMESTAMP] === DATABASE FAILOVER AVVIATO ===" | tee -a $LOG_FILE

# Configurazione
PRIMARY_DB_URL="$DATABASE_URL"
REPLICA_DB_URL="$DATABASE_REPLICA_URL"
FAILOVER_DB_URL="$DATABASE_FAILOVER_URL"

# Verifica stato database primario
check_primary_db() {
    echo "🔍 Verifica database primario..."
    
    if timeout 10 psql "$PRIMARY_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database primario operativo"
        return 0
    else
        echo "❌ Database primario non raggiungibile"
        return 1
    fi
}

# Verifica stato replica
check_replica_db() {
    echo "🔍 Verifica database replica..."
    
    if timeout 10 psql "$REPLICA_DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Database replica operativo"
        return 0
    else
        echo "❌ Database replica non raggiungibile"
        return 1
    fi
}

# Promozione replica a primario
promote_replica() {
    echo "⬆️ Promozione replica a database primario..."
    
    # Qui implementare la logica specifica del database
    # Per PostgreSQL con streaming replication:
    
    # 1. Stop replica
    # pg_ctl stop -D /path/to/replica/data
    
    # 2. Promote replica
    # pg_ctl promote -D /path/to/replica/data
    
    # 3. Update connection string
    # Aggiornare .env con nuovo DATABASE_URL
    
    echo "✅ Replica promossa a primario"
    echo "[$TIMESTAMP] ✅ Replica promossa a primario" >> $LOG_FILE
    
    return 0
}

# Switch applicazione a database failover
switch_to_failover() {
    echo "🔄 Switch a database failover..."
    
    # Backup configurazione corrente
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update DATABASE_URL
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$FAILOVER_DB_URL|" .env
    
    # Restart servizi
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart ecosystem.config.js
        sleep 10
        
        # Verifica funzionamento
        if timeout 30 curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
            echo "✅ Switch a database failover completato"
            echo "[$TIMESTAMP] ✅ Switch a database failover completato" >> $LOG_FILE
            return 0
        else
            echo "❌ Switch a database failover fallito"
            # Rollback
            mv .env.bak .env
            pm2 restart ecosystem.config.js
            return 1
        fi
    else
        echo "❌ PM2 non disponibile per restart"
        return 1
    fi
}

# Esecuzione failover
if ! check_primary_db; then
    echo "🚨 Database primario non disponibile - avvio failover"
    
    if check_replica_db; then
        echo "📋 Strategia: Promozione replica"
        if promote_replica; then
            echo "🎉 Failover completato con successo (replica promossa)"
            exit 0
        fi
    fi
    
    if [ ! -z "$FAILOVER_DB_URL" ]; then
        echo "📋 Strategia: Switch a database failover"
        if switch_to_failover; then
            echo "🎉 Failover completato con successo (database failover)"
            exit 0
        fi
    fi
    
    echo "❌ Failover fallito - intervento manuale richiesto"
    echo "[$TIMESTAMP] ❌ Failover database fallito" >> $LOG_FILE
    exit 1
else
    echo "✅ Database primario operativo - failover non necessario"
    exit 0
fi

echo "[$TIMESTAMP] === DATABASE FAILOVER TERMINATO ===" >> $LOG_FILE
```

### 2. Service Failover

Creare `scripts/service-failover.sh`:

```bash
#!/bin/bash

# Procedura failover servizi
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/service-failover.log"

echo "[$TIMESTAMP] === SERVICE FAILOVER AVVIATO ===" | tee -a $LOG_FILE

# Configurazione servizi
SERVICES=("api" "documents" "proxy")
PORTS=(4001 4002 4003)
HEALTH_ENDPOINTS=("/health" "/health" "/health")

# Verifica stato servizio
check_service() {
    local service_name=$1
    local port=$2
    local health_endpoint=$3
    
    if timeout 10 curl -s "http://localhost:${port}${health_endpoint}" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Restart servizio
restart_service() {
    local service_name=$1
    
    echo "🔄 Restart servizio $service_name..."
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart "$service_name" 2>/dev/null
        sleep 5
        return $?
    else
        echo "❌ PM2 non disponibile"
        return 1
    fi
}

# Failover completo
full_service_restart() {
    echo "🔄 Restart completo tutti i servizi..."
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2 restart ecosystem.config.js
        sleep 15
        
        # Verifica tutti i servizi
        all_ok=true
        for i in "${!SERVICES[@]}"; do
            if ! check_service "${SERVICES[$i]}" "${PORTS[$i]}" "${HEALTH_ENDPOINTS[$i]}"; then
                all_ok=false
                break
            fi
        done
        
        if $all_ok; then
            echo "✅ Restart completo riuscito"
            return 0
        else
            echo "❌ Restart completo fallito"
            return 1
        fi
    else
        echo "❌ PM2 non disponibile"
        return 1
    fi
}

# Controllo e failover servizi
failed_services=()

echo "🔍 Verifica stato servizi..."

for i in "${!SERVICES[@]}"; do
    service="${SERVICES[$i]}"
    port="${PORTS[$i]}"
    endpoint="${HEALTH_ENDPOINTS[$i]}"
    
    if check_service "$service" "$port" "$endpoint"; then
        echo "  ✅ $service (porta $port)"
    else
        echo "  ❌ $service (porta $port)"
        failed_services+=("$service")
    fi
done

if [ ${#failed_services[@]} -eq 0 ]; then
    echo "🎉 Tutti i servizi sono operativi"
    exit 0
fi

echo "🚨 Servizi non funzionanti: ${failed_services[*]}"
echo "[$TIMESTAMP] 🚨 Servizi falliti: ${failed_services[*]}" >> $LOG_FILE

# Tentativo restart servizi singoli
for service in "${failed_services[@]}"; do
    if restart_service "$service"; then
        echo "✅ Restart $service riuscito"
        echo "[$TIMESTAMP] ✅ Restart $service: successo" >> $LOG_FILE
    else
        echo "❌ Restart $service fallito"
        echo "[$TIMESTAMP] ❌ Restart $service: fallito" >> $LOG_FILE
    fi
done

# Verifica finale
sleep 10
still_failed=()

for service in "${failed_services[@]}"; do
    # Trova indice servizio
    for i in "${!SERVICES[@]}"; do
        if [ "${SERVICES[$i]}" = "$service" ]; then
            if ! check_service "$service" "${PORTS[$i]}" "${HEALTH_ENDPOINTS[$i]}"; then
                still_failed+=("$service")
            fi
            break
        fi
    done
done

if [ ${#still_failed[@]} -eq 0 ]; then
    echo "🎉 Failover completato - tutti i servizi ripristinati"
    echo "[$TIMESTAMP] 🎉 Failover servizi completato" >> $LOG_FILE
    exit 0
else
    echo "⚠️ Servizi ancora non funzionanti: ${still_failed[*]}"
    echo "🔄 Tentativo restart completo..."
    
    if full_service_restart; then
        echo "🎉 Restart completo riuscito"
        echo "[$TIMESTAMP] 🎉 Restart completo riuscito" >> $LOG_FILE
        exit 0
    else
        echo "❌ Failover fallito - intervento manuale richiesto"
        echo "[$TIMESTAMP] ❌ Failover servizi fallito" >> $LOG_FILE
        exit 1
    fi
fi

echo "[$TIMESTAMP] === SERVICE FAILOVER TERMINATO ===" >> $LOG_FILE
```

## 📋 Runbook Disaster Recovery

### Scenario 1: Server Singolo Down (Livello 1)

**RTO**: 15 minuti | **RPO**: 4 ore

#### Procedura:
1. **Rilevamento**: Monitoring automatico o segnalazione utente
2. **Diagnosi**: Identificare servizio specifico non funzionante
3. **Azione**: Restart automatico servizio
4. **Verifica**: Test funzionalità
5. **Comunicazione**: Log interno

#### Comandi:
```bash
# Diagnosi rapida
./scripts/disaster-detection.sh

# Restart servizio specifico
pm2 restart api  # o documents, proxy

# Verifica ripristino
curl http://localhost:3000/health
```

### Scenario 2: Database Corrotto (Livello 2)

**RTO**: 2 ore | **RPO**: 1 ora

#### Procedura:
1. **Rilevamento**: Errori database o corruption detection
2. **Isolamento**: Stop servizi che accedono al database
3. **Backup**: Backup emergenza se possibile
4. **Restore**: Ripristino da backup più recente
5. **Verifica**: Test integrità dati
6. **Riavvio**: Restart servizi
7. **Comunicazione**: Notifica stakeholder

#### Comandi:
```bash
# Stop servizi
pm2 stop ecosystem.config.js

# Backup emergenza
./scripts/backup-database.sh

# Restore da backup
./scripts/restore-database.sh ./backups/database/daily/latest.sql.gz

# Restart servizi
pm2 start ecosystem.config.js

# Verifica
./scripts/disaster-detection.sh
```

### Scenario 3: Disaster Completo (Livello 3)

**RTO**: 24 ore | **RPO**: 1 ora

#### Procedura:
1. **Attivazione**: Team di emergenza
2. **Assessment**: Valutazione danni
3. **Infrastruttura**: Setup ambiente alternativo
4. **Restore**: Ripristino completo da backup
5. **Testing**: Verifica funzionalità complete
6. **Switch**: Redirect traffico
7. **Comunicazione**: Aggiornamenti stakeholder

#### Checklist Disaster Completo:
- [ ] Attivazione team emergenza
- [ ] Setup server alternativo
- [ ] Restore database da backup offsite
- [ ] Deploy applicazione
- [ ] Configurazione DNS/proxy
- [ ] Test completo funzionalità
- [ ] Verifica GDPR compliance
- [ ] Comunicazione ripristino

## 🔧 Strumenti di Recovery

### 1. Dashboard di Monitoring

Creare `scripts/create-dashboard.sh`:

```bash
#!/bin/bash

# Creazione dashboard monitoring
DASHBOARD_DIR="./monitoring-dashboard"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p "$DASHBOARD_DIR"

# Generazione dashboard HTML
cat > "$DASHBOARD_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema Monitoring - Project 2.0</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        .card h3 {
            color: #667eea;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .status.ok { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child { border-bottom: none; }
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.3s;
        }
        .refresh-btn:hover { background: #5a6fd8; }
        .timestamp {
            text-align: center;
            color: #666;
            margin-top: 1rem;
            font-size: 0.875rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Sistema Monitoring - Project 2.0</h1>
        <p>Dashboard di monitoraggio in tempo reale</p>
    </div>
    
    <div class="container">
        <div style="text-align: center; margin-bottom: 2rem;">
            <button class="refresh-btn" onclick="refreshData()">🔄 Aggiorna Dati</button>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🖥️ Stato Sistema</h3>
                <div class="metric">
                    <span>CPU Usage</span>
                    <span id="cpu-usage">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Memoria</span>
                    <span id="memory-usage">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Spazio Disco</span>
                    <span id="disk-usage">Caricamento...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🗄️ Database</h3>
                <div class="metric">
                    <span>Stato Connessione</span>
                    <span id="db-status">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Connessioni Attive</span>
                    <span id="db-connections">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Query/sec</span>
                    <span id="db-queries">Caricamento...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🔌 API Server</h3>
                <div class="metric">
                    <span>Stato</span>
                    <span id="api-status">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Tempo Risposta</span>
                    <span id="api-response-time">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Richieste/min</span>
                    <span id="api-requests">Caricamento...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📄 Documents Server</h3>
                <div class="metric">
                    <span>Stato</span>
                    <span id="docs-status">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>PDF Generati</span>
                    <span id="docs-generated">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Coda Elaborazione</span>
                    <span id="docs-queue">Caricamento...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🔀 Proxy Server</h3>
                <div class="metric">
                    <span>Stato</span>
                    <span id="proxy-status">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Traffico</span>
                    <span id="proxy-traffic">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Errori 5xx</span>
                    <span id="proxy-errors">Caricamento...</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🔒 GDPR Compliance</h3>
                <div class="metric">
                    <span>Audit Logs</span>
                    <span id="gdpr-audits">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Consent Records</span>
                    <span id="gdpr-consents">Caricamento...</span>
                </div>
                <div class="metric">
                    <span>Errori GDPR</span>
                    <span id="gdpr-errors">Caricamento...</span>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-update">
            Ultimo aggiornamento: Caricamento...
        </div>
    </div>
    
    <script>
        function getStatusClass(value, thresholds) {
            if (value <= thresholds.ok) return 'ok';
            if (value <= thresholds.warning) return 'warning';
            return 'error';
        }
        
        function formatStatus(status, value = null) {
            const className = status ? 'ok' : 'error';
            const text = status ? (value || 'Online') : 'Offline';
            return `<span class="status ${className}">${text}</span>`;
        }
        
        async function refreshData() {
            try {
                // Simulazione dati (sostituire con chiamate API reali)
                const data = {
                    system: {
                        cpu: Math.floor(Math.random() * 100),
                        memory: Math.floor(Math.random() * 100),
                        disk: Math.floor(Math.random() * 100)
                    },
                    database: {
                        status: Math.random() > 0.1,
                        connections: Math.floor(Math.random() * 50),
                        queries: Math.floor(Math.random() * 1000)
                    },
                    api: {
                        status: Math.random() > 0.05,
                        responseTime: Math.floor(Math.random() * 500),
                        requests: Math.floor(Math.random() * 200)
                    },
                    documents: {
                        status: Math.random() > 0.05,
                        generated: Math.floor(Math.random() * 100),
                        queue: Math.floor(Math.random() * 10)
                    },
                    proxy: {
                        status: Math.random() > 0.05,
                        traffic: Math.floor(Math.random() * 1000),
                        errors: Math.floor(Math.random() * 5)
                    },
                    gdpr: {
                        audits: Math.floor(Math.random() * 500),
                        consents: Math.floor(Math.random() * 100),
                        errors: Math.floor(Math.random() * 3)
                    }
                };
                
                // Aggiornamento UI
                document.getElementById('cpu-usage').innerHTML = 
                    `<span class="status ${getStatusClass(data.system.cpu, {ok: 70, warning: 85})}">${data.system.cpu}%</span>`;
                
                document.getElementById('memory-usage').innerHTML = 
                    `<span class="status ${getStatusClass(data.system.memory, {ok: 70, warning: 85})}">${data.system.memory}%</span>`;
                
                document.getElementById('disk-usage').innerHTML = 
                    `<span class="status ${getStatusClass(data.system.disk, {ok: 70, warning: 85})}">${data.system.disk}%</span>`;
                
                document.getElementById('db-status').innerHTML = formatStatus(data.database.status);
                document.getElementById('db-connections').textContent = data.database.connections;
                document.getElementById('db-queries').textContent = data.database.queries;
                
                document.getElementById('api-status').innerHTML = formatStatus(data.api.status);
                document.getElementById('api-response-time').textContent = `${data.api.responseTime}ms`;
                document.getElementById('api-requests').textContent = data.api.requests;
                
                document.getElementById('docs-status').innerHTML = formatStatus(data.documents.status);
                document.getElementById('docs-generated').textContent = data.documents.generated;
                document.getElementById('docs-queue').textContent = data.documents.queue;
                
                document.getElementById('proxy-status').innerHTML = formatStatus(data.proxy.status);
                document.getElementById('proxy-traffic').textContent = `${data.proxy.traffic} req/min`;
                document.getElementById('proxy-errors').textContent = data.proxy.errors;
                
                document.getElementById('gdpr-audits').textContent = data.gdpr.audits;
                document.getElementById('gdpr-consents').textContent = data.gdpr.consents;
                document.getElementById('gdpr-errors').innerHTML = 
                    `<span class="status ${data.gdpr.errors === 0 ? 'ok' : 'warning'}">${data.gdpr.errors}</span>`;
                
                document.getElementById('last-update').textContent = 
                    `Ultimo aggiornamento: ${new Date().toLocaleString('it-IT')}`;
                
            } catch (error) {
                console.error('Errore aggiornamento dati:', error);
            }
        }
        
        // Auto-refresh ogni 30 secondi
        setInterval(refreshData, 30000);
        
        // Caricamento iniziale
        refreshData();
    </script>
</body>
</html>
EOF

echo "✅ Dashboard monitoring creata in: $DASHBOARD_DIR/index.html"
echo "🌐 Aprire con: open $DASHBOARD_DIR/index.html"
```

### 2. Script di Diagnostica Completa

Creare `scripts/full-diagnostic.sh`:

```bash
#!/bin/bash

# Diagnostica completa sistema
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="./logs/diagnostic-report-$(date +%Y%m%d_%H%M%S).txt"

echo "[$TIMESTAMP] === DIAGNOSTICA COMPLETA SISTEMA ===" | tee "$REPORT_FILE"
echo "Generazione report diagnostico..." | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Informazioni sistema
echo "🖥️ INFORMAZIONI SISTEMA" | tee -a "$REPORT_FILE"
echo "========================" | tee -a "$REPORT_FILE"
echo "Hostname: $(hostname)" | tee -a "$REPORT_FILE"
echo "OS: $(uname -a)" | tee -a "$REPORT_FILE"
echo "Uptime: $(uptime)" | tee -a "$REPORT_FILE"
echo "Data/Ora: $(date)" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Risorse sistema
echo "📊 RISORSE SISTEMA" | tee -a "$REPORT_FILE"
echo "==================" | tee -a "$REPORT_FILE"
echo "CPU:" | tee -a "$REPORT_FILE"
top -l 1 | grep "CPU usage" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"
echo "Memoria:" | tee -a "$REPORT_FILE"
vm_stat | head -5 | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"
echo "Spazio Disco:" | tee -a "$REPORT_FILE"
df -h | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Processi PM2
echo "⚙️ PROCESSI PM2" | tee -a "$REPORT_FILE"
echo "===============" | tee -a "$REPORT_FILE"
if command -v pm2 >/dev/null 2>&1; then
    pm2 list | tee -a "$REPORT_FILE"
    echo | tee -a "$REPORT_FILE"
    pm2 monit --no-colors | head -20 | tee -a "$REPORT_FILE"
else
    echo "PM2 non installato" | tee -a "$REPORT_FILE"
fi
echo | tee -a "$REPORT_FILE"

# Test connettività database
echo "🗄️ DATABASE" | tee -a "$REPORT_FILE"
echo "============" | tee -a "$REPORT_FILE"
if timeout 10 psql "$DATABASE_URL" -c "SELECT version();" 2>/dev/null | tee -a "$REPORT_FILE"; then
    echo "✅ Database raggiungibile" | tee -a "$REPORT_FILE"
    
    # Statistiche database
    echo "Statistiche database:" | tee -a "$REPORT_FILE"
    psql "$DATABASE_URL" -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;" 2>/dev/null | tee -a "$REPORT_FILE"
else
    echo "❌ Database non raggiungibile" | tee -a "$REPORT_FILE"
fi
echo | tee -a "$REPORT_FILE"

# Test servizi
echo "🔌 SERVIZI" | tee -a "$REPORT_FILE"
echo "==========" | tee -a "$REPORT_FILE"

services=("API:3000:/health" "Documents:3001:/health" "Proxy:3002:/health")

for service_info in "${services[@]}"; do
    IFS=':' read -r name port endpoint <<< "$service_info"
    echo "Test $name (porta $port):" | tee -a "$REPORT_FILE"
    
    if timeout 10 curl -s "http://localhost:${port}${endpoint}" >/dev/null 2>&1; then
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:${port}${endpoint}" 2>/dev/null)
        echo "  ✅ Online (${response_time}s)" | tee -a "$REPORT_FILE"
    else
        echo "  ❌ Offline" | tee -a "$REPORT_FILE"
    fi
done
echo | tee -a "$REPORT_FILE"

# Logs recenti
echo "📝 LOGS RECENTI" | tee -a "$REPORT_FILE"
echo "===============" | tee -a "$REPORT_FILE"
echo "Ultimi 10 errori nei log:" | tee -a "$REPORT_FILE"
find ./logs -name "*.log" -type f -exec grep -l "ERROR\|CRITICAL\|FATAL" {} \; | head -3 | while read logfile; do
    echo "--- $logfile ---" | tee -a "$REPORT_FILE"
    tail -5 "$logfile" | grep -E "ERROR|CRITICAL|FATAL" | tee -a "$REPORT_FILE"
done
echo | tee -a "$REPORT_FILE"

# Configurazione
echo "⚙️ CONFIGURAZIONE" | tee -a "$REPORT_FILE"
echo "=================" | tee -a "$REPORT_FILE"
echo "Variabili ambiente critiche:" | tee -a "$REPORT_FILE"
echo "NODE_ENV: ${NODE_ENV:-'non impostato'}" | tee -a "$REPORT_FILE"
echo "DATABASE_URL: $(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')" | tee -a "$REPORT_FILE"
echo "PORT: ${PORT:-'non impostato'}" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Backup status
echo "💾 BACKUP STATUS" | tee -a "$REPORT_FILE"
echo "================" | tee -a "$REPORT_FILE"
if [ -d "./backups" ]; then
    echo "Backup disponibili:" | tee -a "$REPORT_FILE"
    find ./backups -name "*.sql.gz" -o -name "*.tar.gz" | head -10 | while read backup; do
        size=$(du -h "$backup" | cut -f1)
        date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$backup" 2>/dev/null || echo "N/A")
        echo "  $(basename "$backup") - $size ($date)" | tee -a "$REPORT_FILE"
    done
else
    echo "❌ Directory backup non trovata" | tee -a "$REPORT_FILE"
fi
echo | tee -a "$REPORT_FILE"

# Network connectivity
echo "🌐 CONNETTIVITÀ RETE" | tee -a "$REPORT_FILE"
echo "====================" | tee -a "$REPORT_FILE"
echo "Test connettività esterna:" | tee -a "$REPORT_FILE"
if ping -c 3 8.8.8.8 >/dev/null 2>&1; then
    echo "  ✅ Internet raggiungibile" | tee -a "$REPORT_FILE"
else
    echo "  ❌ Internet non raggiungibile" | tee -a "$REPORT_FILE"
fi

if command -v netstat >/dev/null 2>&1; then
    echo "Porte in ascolto:" | tee -a "$REPORT_FILE"
    netstat -an | grep LISTEN | grep -E ":(3000|3001|3002|5432)" | tee -a "$REPORT_FILE"
fi
echo | tee -a "$REPORT_FILE"

# GDPR Compliance Check
echo "🔒 GDPR COMPLIANCE" | tee -a "$REPORT_FILE"
echo "==================" | tee -a "$REPORT_FILE"
if timeout 10 psql "$DATABASE_URL" -c "SELECT COUNT(*) as audit_logs_today FROM gdpr_audit_log WHERE created_at >= CURRENT_DATE;" 2>/dev/null | tee -a "$REPORT_FILE"; then
    psql "$DATABASE_URL" -c "SELECT COUNT(*) as consent_records FROM consent_record WHERE status = 'active';" 2>/dev/null | tee -a "$REPORT_FILE"
    psql "$DATABASE_URL" -c "SELECT COUNT(*) as gdpr_errors FROM gdpr_audit_log WHERE action_type = 'error' AND created_at >= CURRENT_DATE;" 2>/dev/null | tee -a "$REPORT_FILE"
else
    echo "❌ Impossibile verificare GDPR compliance" | tee -a "$REPORT_FILE"
fi
echo | tee -a "$REPORT_FILE"

# Riepilogo finale
echo "📋 RIEPILOGO DIAGNOSTICA" | tee -a "$REPORT_FILE"
echo "========================" | tee -a "$REPORT_FILE"
echo "Report generato: $TIMESTAMP" | tee -a "$REPORT_FILE"
echo "File report: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

# Raccomandazioni
echo "💡 RACCOMANDAZIONI" | tee -a "$REPORT_FILE"
echo "==================" | tee -a "$REPORT_FILE"
echo "1. Verificare regolarmente i backup" | tee -a "$REPORT_FILE"
echo "2. Monitorare l'utilizzo delle risorse" | tee -a "$REPORT_FILE"
echo "3. Controllare i log per errori" | tee -a "$REPORT_FILE"
echo "4. Testare le procedure di disaster recovery" | tee -a "$REPORT_FILE"
echo "5. Mantenere aggiornata la documentazione" | tee -a "$REPORT_FILE"
echo | tee -a "$REPORT_FILE"

echo "[$TIMESTAMP] === DIAGNOSTICA COMPLETA TERMINATA ===" | tee -a "$REPORT_FILE"
echo "📄 Report salvato in: $REPORT_FILE"
```

## 📞 Contatti di Emergenza

### Team di Risposta

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTATTI EMERGENZA                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│   RUOLO         │   CONTATTO      │   RESPONSABILITÀ        │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Project Owner   │ [CONFIGURARE]   │ • Decisioni critiche    │
│                 │                 │ • Autorizzazioni        │
│                 │                 │ • Comunicazioni esterne │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Tech Lead       │ [CONFIGURARE]   │ • Coordinamento tecnico │
│                 │                 │ • Procedure recovery    │
│                 │                 │ • Escalation L2/L3      │
├─────────────────┼─────────────────┼─────────────────────────┤
│ DevOps Engineer │ [CONFIGURARE]   │ • Infrastruttura        │
│                 │                 │ • Monitoring            │
│                 │                 │ • Deployment            │
├─────────────────┼─────────────────┼─────────────────────────┤
│ DBA             │ [CONFIGURARE]   │ • Database recovery     │
│                 │                 │ • Backup/Restore        │
│                 │                 │ • Performance tuning   │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Security Officer│ [CONFIGURARE]   │ • GDPR compliance       │
│                 │                 │ • Security incidents   │
│                 │                 │ • Audit trails         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Escalation Matrix

| Severità | Tempo Risposta | Contatti | Autorizzazioni |
|----------|----------------|----------|----------------|
| **L1 - Minore** | 30 minuti | Tech Lead | Auto-recovery |
| **L2 - Moderato** | 15 minuti | Tech Lead + DevOps | Restart servizi |
| **L3 - Critico** | 5 minuti | Tutti + Project Owner | Tutte le azioni |

## 🔄 Procedure di Test

### Test Disaster Recovery Mensile

```bash
#!/bin/bash
# Test DR mensile

echo "🧪 Test Disaster Recovery - $(date)"

# 1. Test backup integrity
./scripts/verify-backups.sh

# 2. Test restore su ambiente isolato
./scripts/restore-database.sh ./backups/database/daily/latest.sql.gz test_restore_db

# 3. Test failover servizi
./scripts/service-failover.sh --test-mode

# 4. Test monitoring e alerting
./scripts/disaster-detection.sh

# 5. Test comunicazioni emergenza
echo "📧 Test notifiche emergenza..."

echo "✅ Test DR completato"
```

### Checklist Test DR

- [ ] **Backup Integrity**
  - [ ] Verifica backup database
  - [ ] Verifica backup files
  - [ ] Test decrittografia
  - [ ] Controllo retention policies

- [ ] **Restore Procedures**
  - [ ] Restore database completo
  - [ ] Restore files applicazione
  - [ ] Restore configurazioni
  - [ ] Verifica integrità dati

- [ ] **Failover Testing**
  - [ ] Failover database
  - [ ] Failover servizi
  - [ ] Test load balancing
  - [ ] Verifica switch automatico

- [ ] **Monitoring & Alerting**
  - [ ] Test detection automatico
  - [ ] Verifica soglie alert
  - [ ] Test notifiche
  - [ ] Dashboard monitoring

- [ ] **Communication**
  - [ ] Test escalation
  - [ ] Verifica contatti
  - [ ] Test canali comunicazione
  - [ ] Update stakeholder

## 📚 Documentazione di Riferimento

### Link Utili

- [Backup e Restore](./backup-restore.md)
- [Monitoring](./monitoring.md)
- [Server Management](./server-management.md)
- [Environment Setup](./environment-setup.md)

### Comandi Rapidi

```bash
# Stato generale sistema
./scripts/disaster-detection.sh

# Backup emergenza
./scripts/backup-all.sh

# Restart servizi
pm2 restart ecosystem.config.js

# Verifica database
psql "$DATABASE_URL" -c "SELECT 1;"

# Logs errori
grep -r "ERROR" ./logs/ | tail -20

# Spazio disco
df -h

# Processi attivi
pm2 list

# Test connettività
curl http://localhost:3000/health
```

---

**🚨 IMPORTANTE**: Questo documento deve essere sempre aggiornato e accessibile anche in caso di disaster. Mantenere copie offline e in location multiple. Per emergenze critiche, contattare immediatamente il Project Owner e seguire le procedure di escalation definite.