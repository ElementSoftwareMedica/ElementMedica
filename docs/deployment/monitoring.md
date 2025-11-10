# 📊 Monitoraggio e Health Checks

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa guida fornisce istruzioni complete per il monitoraggio del sistema unificato Person con architettura a tre server, inclusi health checks automatici, metriche di performance e alerting.

## 🏗️ Architettura Monitoraggio

### Componenti da Monitorare

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Proxy Server  │    │   API Server    │    │Documents Server │
│   Porta: 4003   │    │   Porta: 4001   │    │   Porta: 4002   │
│                 │    │                 │    │                 │
│ ✓ Response Time │    │ ✓ Response Time │    │ ✓ Response Time │
│ ✓ Request Rate  │    │ ✓ Database Conn │    │ ✓ PDF Generation│
│ ✓ Error Rate    │    │ ✓ Memory Usage  │    │ ✓ File Storage  │
│ ✓ CORS Issues   │    │ ✓ JWT Validation│    │ ✓ Template Load │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Porta: 5432   │
                    │                 │
                    │ ✓ Connections   │
                    │ ✓ Query Time    │
                    │ ✓ Lock Waits    │
                    │ ✓ Disk Usage    │
                    └─────────────────┘
```

## 🔍 Health Checks

### 1. Health Check Endpoints

Ogni server deve implementare endpoint di health check.

Nota operativa: la validazione dei token è centralizzata in JWTService; il Proxy non firma token e non richiede variabili JWT. L'API Server deve avere JWT_SECRET e JWT_REFRESH_SECRET impostati correttamente.

#### API Server (4001)
```javascript
// /api/health
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Test configurazione JWT centralizzata (senza firmare token in linea)
    const jwtConfigured = (typeof JWTService?.validateConfig === 'function')
      ? JWTService.validateConfig()
      : Boolean(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET);
    
    if (!jwtConfigured) {
      throw new Error('JWT non configurato correttamente');
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'api-server',
      port: 4001,
      database: 'connected',
      jwt: 'valid',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      server: 'api-server',
      error: error.message
    });
  }
});
```

#### Documents Server (4002)
```javascript
// /health
app.get('/health', async (req, res) => {
  try {
    // Test PDF generation capability
    const testPdf = await generateTestPdf();
    
    // Test file system access
    await fs.access('./storage', fs.constants.W_OK);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'documents-server',
      port: 4002,
      pdfGeneration: 'working',
      storage: 'accessible',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      server: 'documents-server',
      error: error.message
    });
  }
});
```

#### Proxy Server (4003)
```javascript
// /health
app.get('/health', async (req, res) => {
  try {
    // Test connectivity to other servers
    const apiHealth = await fetch('http://localhost:4001/api/health');
    const docsHealth = await fetch('http://localhost:4002/health');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      server: 'proxy-server',
      port: 4003,
      apiServer: apiHealth.ok ? 'connected' : 'disconnected',
      documentsServer: docsHealth.ok ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      server: 'proxy-server',
      error: error.message
    });
  }
});
```

### 2. Script Health Check Automatico

Creare `scripts/health-check.sh`:

```bash
#!/bin/bash

# Configurazione
API_URL="http://localhost:4001"
DOCS_URL="http://localhost:4002"
PROXY_URL="http://localhost:4003"
LOG_FILE="./logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
ALERT_THRESHOLD=3  # Numero di fallimenti consecutivi prima di alert

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "[$TIMESTAMP] === HEALTH CHECK AVVIATO ===" | tee -a $LOG_FILE

# Funzione per test endpoint con timeout
test_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    echo -n "Testing $name... "
    
    if response=$(curl -f -s --max-time $timeout "$url/health" 2>/dev/null); then
        # Parse response per dettagli
        status=$(echo $response | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        uptime=$(echo $response | jq -r '.uptime // "unknown"' 2>/dev/null || echo "unknown")
        
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ OK${NC} (uptime: ${uptime}s)"
            echo "[$TIMESTAMP] ✅ $name: OK (status: $status, uptime: ${uptime}s)" >> $LOG_FILE
            return 0
        else
            echo -e "${YELLOW}⚠️ DEGRADED${NC} (status: $status)"
            echo "[$TIMESTAMP] ⚠️ $name: DEGRADED (status: $status)" >> $LOG_FILE
            return 1
        fi
    else
        echo -e "${RED}❌ ERRORE${NC}"
        echo "[$TIMESTAMP] ❌ $name: ERRORE (non raggiungibile)" >> $LOG_FILE
        return 1
    fi
}

# Funzione per test database
test_database() {
    echo -n "Testing Database... "
    
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        # Test performance query
        query_time=$(psql "$DATABASE_URL" -c "\timing on" -c "SELECT COUNT(*) FROM person WHERE deletedAt IS NULL;" 2>/dev/null | grep "Time:" | awk '{print $2}' || echo "unknown")
        
        echo -e "${GREEN}✅ OK${NC} (query time: ${query_time})"
        echo "[$TIMESTAMP] ✅ Database: OK (query time: $query_time)" >> $LOG_FILE
        return 0
    else
        echo -e "${RED}❌ ERRORE${NC}"
        echo "[$TIMESTAMP] ❌ Database: ERRORE (connessione fallita)" >> $LOG_FILE
        return 1
    fi
}

# Funzione per test PM2
test_pm2_processes() {
    echo -n "Testing PM2 Processes... "
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2_status=$(pm2 jlist 2>/dev/null)
        if [ $? -eq 0 ]; then
            running_count=$(echo $pm2_status | jq '[.[] | select(.pm2_env.status == "online")] | length' 2>/dev/null || echo "0")
            total_count=$(echo $pm2_status | jq 'length' 2>/dev/null || echo "0")
            
            if [ "$running_count" = "$total_count" ] && [ "$total_count" -gt 0 ]; then
                echo -e "${GREEN}✅ OK${NC} ($running_count/$total_count online)"
                echo "[$TIMESTAMP] ✅ PM2: OK ($running_count/$total_count processi online)" >> $LOG_FILE
                return 0
            else
                echo -e "${YELLOW}⚠️ PARZIALE${NC} ($running_count/$total_count online)"
                echo "[$TIMESTAMP] ⚠️ PM2: PARZIALE ($running_count/$total_count processi online)" >> $LOG_FILE
                return 1
            fi
        else
            echo -e "${RED}❌ ERRORE${NC} (PM2 non risponde)"
            echo "[$TIMESTAMP] ❌ PM2: ERRORE (comando fallito)" >> $LOG_FILE
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ N/A${NC} (PM2 non installato)"
        echo "[$TIMESTAMP] ⚠️ PM2: N/A (non installato)" >> $LOG_FILE
        return 1
    fi
}

# Esecuzione test
echo "🔍 Controllo stato sistema..."
echo

# Test singoli componenti
api_status=0
docs_status=0
proxy_status=0
db_status=0
pm2_status=0

test_endpoint $PROXY_URL "Proxy Server" 5 || proxy_status=1
test_endpoint $API_URL "API Server" 10 || api_status=1
test_endpoint $DOCS_URL "Documents Server" 15 || docs_status=1
test_database || db_status=1
test_pm2_processes || pm2_status=1

echo

# Calcolo stato generale
total_errors=$((api_status + docs_status + proxy_status + db_status + pm2_status))
total_components=5

if [ $total_errors -eq 0 ]; then
    echo -e "🎉 ${GREEN}SISTEMA COMPLETAMENTE OPERATIVO${NC}"
    echo "[$TIMESTAMP] 🎉 SISTEMA: COMPLETAMENTE OPERATIVO (0/$total_components errori)" >> $LOG_FILE
    exit_code=0
elif [ $total_errors -le 1 ]; then
    echo -e "⚠️ ${YELLOW}SISTEMA PARZIALMENTE OPERATIVO${NC} ($total_errors/$total_components componenti con problemi)"
    echo "[$TIMESTAMP] ⚠️ SISTEMA: PARZIALMENTE OPERATIVO ($total_errors/$total_components errori)" >> $LOG_FILE
    exit_code=1
else
    echo -e "🚨 ${RED}SISTEMA CON PROBLEMI CRITICI${NC} ($total_errors/$total_components componenti con errori)"
    echo "[$TIMESTAMP] 🚨 SISTEMA: PROBLEMI CRITICI ($total_errors/$total_components errori)" >> $LOG_FILE
    exit_code=2
fi

# Dettagli aggiuntivi se ci sono errori
if [ $total_errors -gt 0 ]; then
    echo
    echo "📋 Dettagli problemi rilevati:"
    [ $proxy_status -eq 1 ] && echo "   • Proxy Server non raggiungibile o degradato"
    [ $api_status -eq 1 ] && echo "   • API Server non raggiungibile o degradato"
    [ $docs_status -eq 1 ] && echo "   • Documents Server non raggiungibile o degradato"
    [ $db_status -eq 1 ] && echo "   • Database non raggiungibile o lento"
    [ $pm2_status -eq 1 ] && echo "   • PM2 processi non tutti online"
    
    echo
    echo "🔧 Azioni suggerite:"
    echo "   1. Verificare logs: pm2 logs"
    echo "   2. Controllare risorse: pm2 monit"
    echo "   3. Verificare connettività database"
    echo "   4. ⚠️ Se necessario riavvio, RICHIEDERE AUTORIZZAZIONE al proprietario"
fi

echo
echo "[$TIMESTAMP] === HEALTH CHECK COMPLETATO ===" | tee -a $LOG_FILE

# Gestione alerting (se configurato)
if [ $total_errors -ge $ALERT_THRESHOLD ]; then
    echo "[$TIMESTAMP] 🚨 ALERT: $total_errors errori rilevati (soglia: $ALERT_THRESHOLD)" >> $LOG_FILE
    
    # Qui si potrebbe aggiungere notifica email/Slack
    # send_alert "Sistema con $total_errors errori critici"
fi

exit $exit_code
```

### 3. Configurazione Cron per Health Checks

```bash
# Aggiungere a crontab (crontab -e)

# Health check ogni 2 minuti
*/2 * * * * /path/to/project/scripts/health-check.sh > /dev/null 2>&1

# Health check dettagliato ogni 15 minuti con output
*/15 * * * * /path/to/project/scripts/health-check.sh >> /path/to/project/logs/health-check-detailed.log 2>&1

# Health check giornaliero con report completo
0 8 * * * /path/to/project/scripts/health-check.sh | mail -s "Daily Health Report" admin@company.com
```

## 📈 Monitoraggio Performance

### 1. Metriche Chiave

#### Server Metrics
```bash
# Script per raccolta metriche
#!/bin/bash

METRICS_FILE="./logs/metrics-$(date +%Y%m%d).log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] === RACCOLTA METRICHE ===" >> $METRICS_FILE

# CPU e Memoria sistema
echo "[$TIMESTAMP] CPU_USAGE: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%" >> $METRICS_FILE
echo "[$TIMESTAMP] MEMORY_USAGE: $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%" >> $METRICS_FILE
echo "[$TIMESTAMP] DISK_USAGE: $(df / | tail -1 | awk '{print $5}')" >> $METRICS_FILE

# Metriche PM2
if command -v pm2 >/dev/null 2>&1; then
    pm2 jlist | jq -r '.[] | "[\($timestamp)] PM2_\(.name): CPU \(.monit.cpu)% | Memory \(.monit.memory / 1024 / 1024 | floor)MB | Uptime \(.pm2_env.pm_uptime)ms"' >> $METRICS_FILE
fi

# Connessioni database
if [ ! -z "$DATABASE_URL" ]; then
    db_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "N/A")
    echo "[$TIMESTAMP] DB_ACTIVE_CONNECTIONS: $db_connections" >> $METRICS_FILE
    
    db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null || echo "N/A")
    echo "[$TIMESTAMP] DB_SIZE: $db_size" >> $METRICS_FILE
fi

# Response time test
for endpoint in "http://localhost:4003/health" "http://localhost:4001/api/health" "http://localhost:4002/health"; do
    response_time=$(curl -o /dev/null -s -w "%{time_total}" "$endpoint" 2>/dev/null || echo "N/A")
    server_name=$(echo $endpoint | cut -d':' -f3 | cut -d'/' -f1)
    echo "[$TIMESTAMP] RESPONSE_TIME_$server_name: ${response_time}s" >> $METRICS_FILE
done

echo "[$TIMESTAMP] === FINE RACCOLTA METRICHE ===" >> $METRICS_FILE
```

#### Application Metrics
```javascript
// Middleware per metriche applicazione
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const metrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    // Log metriche (senza dati personali)
    logger.info('REQUEST_METRICS', {
      method: metrics.method,
      url: metrics.url,
      statusCode: metrics.statusCode,
      responseTime: metrics.responseTime
    });
    
    // Alert per response time elevati
    if (duration > 5000) { // 5 secondi
      logger.warn('SLOW_REQUEST', {
        url: metrics.url,
        responseTime: duration
      });
    }
  });
  
  next();
};
```

### 2. Dashboard Metriche

Script per generare report HTML:

```bash
#!/bin/bash

# Genera dashboard HTML con metriche
generate_dashboard() {
    local output_file="./logs/dashboard-$(date +%Y%m%d_%H%M%S).html"
    
    cat > $output_file << EOF
<!DOCTYPE html>
<html>
<head>
    <title>System Dashboard - $(date)</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-ok { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖥️ System Dashboard</h1>
        <p><strong>Generato:</strong> $(date)</p>
        
        <div class="grid">
            <div class="card">
                <h2>🔍 Health Status</h2>
EOF

    # Aggiungi stato health check
    if ./scripts/health-check.sh > /dev/null 2>&1; then
        echo '                <p class="status-ok">✅ Sistema Operativo</p>' >> $output_file
    else
        echo '                <p class="status-error">❌ Sistema con Problemi</p>' >> $output_file
    fi
    
    cat >> $output_file << EOF
            </div>
            
            <div class="card">
                <h2>📊 System Metrics</h2>
EOF

    # Aggiungi metriche sistema
    echo "                <div class='metric'><strong>CPU:</strong> $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%</div>" >> $output_file
    echo "                <div class='metric'><strong>Memory:</strong> $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%</div>" >> $output_file
    echo "                <div class='metric'><strong>Disk:</strong> $(df / | tail -1 | awk '{print $5}')</div>" >> $output_file
    
    cat >> $output_file << EOF
            </div>
            
            <div class="card">
                <h2>🚀 PM2 Processes</h2>
                <pre>$(pm2 status 2>/dev/null || echo "PM2 non disponibile")</pre>
            </div>
            
            <div class="card">
                <h2>🗄️ Database</h2>
EOF

    if [ ! -z "$DATABASE_URL" ]; then
        db_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "N/A")
        db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null || echo "N/A")
        echo "                <div class='metric'><strong>Connessioni Attive:</strong> $db_connections</div>" >> $output_file
        echo "                <div class='metric'><strong>Dimensione DB:</strong> $db_size</div>" >> $output_file
    else
        echo "                <p>Database non configurato</p>" >> $output_file
    fi
    
    cat >> $output_file << EOF
            </div>
        </div>
        
        <div class="card">
            <h2>📝 Recent Logs</h2>
            <h3>Health Check Logs (ultime 10 righe):</h3>
            <pre>$(tail -n 10 ./logs/health-check.log 2>/dev/null || echo "Nessun log disponibile")</pre>
            
            <h3>Error Logs (ultime 5 righe):</h3>
            <pre>$(tail -n 5 ./logs/*error.log 2>/dev/null || echo "Nessun errore recente")</pre>
        </div>
    </div>
</body>
</html>
EOF

    echo "Dashboard generato: $output_file"
    echo "Apri con: open $output_file"
}

# Esegui generazione
generate_dashboard
```

## 🚨 Alerting e Notifiche

### 1. Sistema di Alert

```bash
#!/bin/bash

# Sistema di alerting
ALERT_CONFIG_FILE="./config/alerts.conf"
ALERT_LOG_FILE="./logs/alerts.log"

# Configurazione soglie
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=5000  # ms
ERROR_RATE_THRESHOLD=5        # %

# Funzione per inviare alert
send_alert() {
    local severity=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Log alert
    echo "[$timestamp] [$severity] $message" >> $ALERT_LOG_FILE
    
    # Console output
    case $severity in
        "CRITICAL")
            echo -e "🚨 ${RED}CRITICAL ALERT${NC}: $message"
            ;;
        "WARNING")
            echo -e "⚠️ ${YELLOW}WARNING${NC}: $message"
            ;;
        "INFO")
            echo -e "ℹ️ ${GREEN}INFO${NC}: $message"
            ;;
    esac
    
    # Qui si potrebbero aggiungere notifiche:
    # - Email: echo "$message" | mail -s "[$severity] System Alert" admin@company.com
    # - Slack: curl -X POST -H 'Content-type: application/json' --data '{"text":"'$message'"}' $SLACK_WEBHOOK
    # - SMS: curl -X POST "$SMS_API_URL" -d "message=$message"
}

# Controlli automatici
check_system_resources() {
    # CPU
    cpu_usage=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
    if [ "$cpu_usage" -gt "$CPU_THRESHOLD" ]; then
        send_alert "WARNING" "CPU usage elevato: ${cpu_usage}% (soglia: ${CPU_THRESHOLD}%)"
    fi
    
    # Memory
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$memory_usage" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "WARNING" "Memory usage elevato: ${memory_usage}% (soglia: ${MEMORY_THRESHOLD}%)"
    fi
    
    # Disk
    disk_usage=$(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
    if [ "$disk_usage" -gt "$DISK_THRESHOLD" ]; then
        send_alert "CRITICAL" "Disk usage critico: ${disk_usage}% (soglia: ${DISK_THRESHOLD}%)"
    fi
}

# Controllo errori nei logs
check_error_logs() {
    local error_count=$(grep -c "ERROR" ./logs/*error.log 2>/dev/null || echo "0")
    local total_requests=$(grep -c "REQUEST" ./logs/*access.log 2>/dev/null || echo "1")
    
    if [ "$total_requests" -gt 0 ]; then
        local error_rate=$((error_count * 100 / total_requests))
        if [ "$error_rate" -gt "$ERROR_RATE_THRESHOLD" ]; then
            send_alert "WARNING" "Error rate elevato: ${error_rate}% (${error_count}/${total_requests} richieste)"
        fi
    fi
}

# Esecuzione controlli
check_system_resources
check_error_logs
```

### 2. Configurazione Cron per Alerting

```bash
# Controlli risorse ogni 5 minuti
*/5 * * * * /path/to/project/scripts/check-alerts.sh

# Report giornaliero
0 9 * * * /path/to/project/scripts/daily-report.sh | mail -s "Daily System Report" admin@company.com

# Pulizia logs settimanale
0 2 * * 0 find /path/to/project/logs -name "*.log" -mtime +7 -delete
```

## 📊 Logging e Audit

### 1. Struttura Logs

```
logs/
├── health-check.log          # Health checks automatici
├── metrics-YYYYMMDD.log       # Metriche giornaliere
├── alerts.log                 # Sistema alerting
├── api-server/
│   ├── access.log            # Richieste API
│   ├── error.log             # Errori API
│   ├── audit.log             # Audit GDPR
│   └── performance.log       # Performance API
├── documents-server/
│   ├── generation.log        # Generazione documenti
│   ├── error.log             # Errori documents
│   └── performance.log       # Performance documents
├── proxy-server/
│   ├── access.log            # Richieste proxy
│   ├── error.log             # Errori proxy
│   └── routing.log           # Routing decisions
└── system/
    ├── startup.log           # Avvio sistema
    ├── shutdown.log          # Spegnimento sistema
    └── maintenance.log       # Operazioni manutenzione
```

### 2. Configurazione Logrotate

```bash
# /etc/logrotate.d/project-2.0
/path/to/project/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 user group
    postrotate
        # Ricarica logs PM2 se necessario
        if command -v pm2 >/dev/null 2>&1; then
            pm2 reloadLogs
        fi
    endscript
}

/path/to/project/logs/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 user group
}
```

## 🔧 Troubleshooting Monitoraggio

### Problemi Comuni

#### Health Check Fallisce
```bash
# Debug health check
./scripts/health-check.sh

# Verifica manuale endpoint
curl -v http://localhost:4003/health
curl -v http://localhost:4001/api/health
curl -v http://localhost:4002/health

# Verifica logs
tail -f logs/health-check.log
```

#### Metriche Non Raccolte
```bash
# Verifica permessi
ls -la logs/
ls -la scripts/

# Test script metriche
./scripts/collect-metrics.sh

# Verifica cron
crontab -l
sudo tail -f /var/log/cron
```

#### Alert Non Funzionano
```bash
# Test sistema alert
./scripts/check-alerts.sh

# Verifica configurazione
cat config/alerts.conf

# Test notifiche
echo "Test alert" | mail -s "Test" admin@company.com
```

## 📋 Checklist Monitoraggio

### Setup Iniziale
- [ ] Health check endpoints implementati su tutti i server
- [ ] Script health-check.sh configurato e testato
- [ ] Cron jobs configurati per controlli automatici
- [ ] Sistema alerting configurato
- [ ] Logrotate configurato
- [ ] Dashboard metriche funzionante

### Controlli Giornalieri
- [ ] Verifica health check: `./scripts/health-check.sh`
- [ ] Controllo logs errori: `tail -f logs/*error.log`
- [ ] Verifica metriche sistema: `./scripts/collect-metrics.sh`
- [ ] Controllo spazio disco: `df -h`
- [ ] Verifica processi PM2: `pm2 status`

### Controlli Settimanali
- [ ] Analisi trend metriche
- [ ] Pulizia logs vecchi
- [ ] Verifica backup logs
- [ ] Test sistema alerting
- [ ] Aggiornamento dashboard

### Controlli Mensili
- [ ] Review soglie alerting
- [ ] Analisi performance trend
- [ ] Ottimizzazione configurazioni
- [ ] Test disaster recovery
- [ ] Aggiornamento documentazione

---

**⚠️ Importante**: Il monitoraggio è essenziale per mantenere la stabilità del sistema. Configurare sempre alerting appropriato e non ignorare mai warning o errori ricorrenti. Per interventi sui server basati su alert, richiedere sempre autorizzazione al proprietario del progetto.