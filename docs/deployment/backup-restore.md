# 💾 Backup e Restore

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Architettura Tre Server GDPR-Compliant

## 🎯 Panoramica

Questa guida fornisce procedure complete per backup e restore del sistema unificato Person, garantendo la protezione dei dati e la compliance GDPR con politiche di retention appropriate.

## 🏗️ Strategia Backup

### Componenti da Proteggere

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Database      │    │   File System   │    │   Configurazioni│
│   PostgreSQL    │    │   Uploads/Docs   │    │   .env/configs  │
│                 │    │                 │    │                 │
│ • Person Data   │    │ • PDF Documents │    │ • Environment   │
│ • Audit Logs    │    │ • Templates     │    │ • PM2 Config    │
│ • GDPR Records  │    │ • Certificates  │    │ • SSL Certs     │
│ • Consent Data  │    │ • User Uploads  │    │ • API Keys      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Backup Storage│
                    │   Encrypted     │
                    │                 │
                    │ • Daily Full    │
                    │ • Hourly Incr   │
                    │ • GDPR Compliant│
                    │ • Retention 7Y  │
                    └─────────────────┘
```

### Politiche di Backup

#### Frequenza
- **Database**: Backup completo giornaliero + incrementale ogni 4 ore
- **File System**: Backup giornaliero con sincronizzazione
- **Configurazioni**: Backup settimanale + ad ogni modifica
- **Logs**: Archiviazione giornaliera con retention GDPR

#### Retention GDPR-Compliant
```bash
# Politiche di conservazione
DAILY_RETENTION=30      # 30 giorni backup giornalieri
WEEKLY_RETENTION=52     # 52 settimane backup settimanali
MONTHLY_RETENTION=84    # 84 mesi (7 anni) backup mensili
AUDIT_RETENTION=3650    # 10 anni per audit logs GDPR
```

## 🗄️ Backup Database

### 1. Script Backup Completo

Creare `scripts/backup-database.sh`:

```bash
#!/bin/bash

# Configurazione
BACKUP_DIR="./backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_SIMPLE=$(date +%Y%m%d)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup.log"

# Politiche retention
DAILY_RETENTION=30
WEEKLY_RETENTION=52
MONTHLY_RETENTION=84
AUDIT_RETENTION=3650

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "[$TIMESTAMP] === BACKUP DATABASE AVVIATO ===" | tee -a $LOG_FILE

# Verifica prerequisiti
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERRORE: DATABASE_URL non configurato${NC}"
    echo "[$TIMESTAMP] ❌ ERRORE: DATABASE_URL non configurato" >> $LOG_FILE
    exit 1
fi

# Creazione directory backup
mkdir -p $BACKUP_DIR/{daily,weekly,monthly,audit}

# Funzione backup con compressione e crittografia
perform_backup() {
    local backup_type=$1
    local backup_file="$BACKUP_DIR/$backup_type/db_${backup_type}_${DATE}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.enc"
    
    echo -n "Eseguendo backup $backup_type... "
    
    # Backup database
    if pg_dump "$DATABASE_URL" > "$backup_file" 2>/dev/null; then
        # Compressione
        if gzip "$backup_file"; then
            # Crittografia (se configurata)
            if [ ! -z "$BACKUP_ENCRYPTION_KEY" ]; then
                if openssl enc -aes-256-cbc -salt -in "$compressed_file" -out "$encrypted_file" -k "$BACKUP_ENCRYPTION_KEY" 2>/dev/null; then
                    rm "$compressed_file"
                    backup_final_file="$encrypted_file"
                else
                    echo -e "${YELLOW}⚠️ Crittografia fallita, mantenuto file compresso${NC}"
                    backup_final_file="$compressed_file"
                fi
            else
                backup_final_file="$compressed_file"
            fi
            
            # Verifica dimensione e integrità
            file_size=$(du -h "$backup_final_file" | cut -f1)
            
            echo -e "${GREEN}✅ OK${NC} (${file_size})"
            echo "[$TIMESTAMP] ✅ Backup $backup_type completato: $backup_final_file (${file_size})" >> $LOG_FILE
            
            # Test integrità (solo per file non crittografati)
            if [[ "$backup_final_file" == *.gz ]]; then
                if gzip -t "$backup_final_file" 2>/dev/null; then
                    echo "[$TIMESTAMP] ✅ Test integrità $backup_type: OK" >> $LOG_FILE
                else
                    echo "[$TIMESTAMP] ❌ Test integrità $backup_type: FALLITO" >> $LOG_FILE
                fi
            fi
            
            return 0
        else
            echo -e "${RED}❌ ERRORE compressione${NC}"
            echo "[$TIMESTAMP] ❌ Errore compressione backup $backup_type" >> $LOG_FILE
            rm -f "$backup_file"
            return 1
        fi
    else
        echo -e "${RED}❌ ERRORE backup${NC}"
        echo "[$TIMESTAMP] ❌ Errore backup database $backup_type" >> $LOG_FILE
        return 1
    fi
}

# Backup giornaliero
perform_backup "daily"
daily_status=$?

# Backup settimanale (solo domenica)
if [ $(date +%u) -eq 7 ]; then
    perform_backup "weekly"
    weekly_status=$?
else
    weekly_status=0
fi

# Backup mensile (primo giorno del mese)
if [ $(date +%d) -eq 01 ]; then
    perform_backup "monthly"
    monthly_status=$?
else
    monthly_status=0
fi

# Backup audit logs separato (GDPR compliance)
echo -n "Backup audit logs... "
audit_backup_file="$BACKUP_DIR/audit/audit_logs_${DATE}.sql"
if psql "$DATABASE_URL" -c "\copy (SELECT * FROM gdpr_audit_log WHERE created_at >= CURRENT_DATE - INTERVAL '1 day') TO '$audit_backup_file' WITH CSV HEADER" 2>/dev/null; then
    gzip "$audit_backup_file"
    audit_size=$(du -h "${audit_backup_file}.gz" | cut -f1)
    echo -e "${GREEN}✅ OK${NC} (${audit_size})"
    echo "[$TIMESTAMP] ✅ Backup audit logs completato: ${audit_backup_file}.gz (${audit_size})" >> $LOG_FILE
    audit_status=0
else
    echo -e "${RED}❌ ERRORE${NC}"
    echo "[$TIMESTAMP] ❌ Errore backup audit logs" >> $LOG_FILE
    audit_status=1
fi

# Pulizia backup vecchi
echo "Pulizia backup vecchi..."

# Daily backups (mantieni ultimi 30)
find $BACKUP_DIR/daily -name "db_daily_*.sql.*" -mtime +$DAILY_RETENTION -delete 2>/dev/null
daily_cleaned=$(find $BACKUP_DIR/daily -name "db_daily_*.sql.*" -mtime +$DAILY_RETENTION 2>/dev/null | wc -l)

# Weekly backups (mantieni ultimi 52)
find $BACKUP_DIR/weekly -name "db_weekly_*.sql.*" -mtime +$((WEEKLY_RETENTION * 7)) -delete 2>/dev/null
weekly_cleaned=$(find $BACKUP_DIR/weekly -name "db_weekly_*.sql.*" -mtime +$((WEEKLY_RETENTION * 7)) 2>/dev/null | wc -l)

# Monthly backups (mantieni ultimi 84)
find $BACKUP_DIR/monthly -name "db_monthly_*.sql.*" -mtime +$((MONTHLY_RETENTION * 30)) -delete 2>/dev/null
monthly_cleaned=$(find $BACKUP_DIR/monthly -name "db_monthly_*.sql.*" -mtime +$((MONTHLY_RETENTION * 30)) 2>/dev/null | wc -l)

# Audit logs (mantieni 10 anni)
find $BACKUP_DIR/audit -name "audit_logs_*.sql.*" -mtime +$AUDIT_RETENTION -delete 2>/dev/null
audit_cleaned=$(find $BACKUP_DIR/audit -name "audit_logs_*.sql.*" -mtime +$AUDIT_RETENTION 2>/dev/null | wc -l)

echo "[$TIMESTAMP] Pulizia completata: daily($daily_cleaned), weekly($weekly_cleaned), monthly($monthly_cleaned), audit($audit_cleaned) file rimossi" >> $LOG_FILE

# Statistiche backup
echo
echo "📊 Statistiche Backup:"
echo "   Daily backups: $(find $BACKUP_DIR/daily -name "db_daily_*.sql.*" | wc -l) file"
echo "   Weekly backups: $(find $BACKUP_DIR/weekly -name "db_weekly_*.sql.*" | wc -l) file"
echo "   Monthly backups: $(find $BACKUP_DIR/monthly -name "db_monthly_*.sql.*" | wc -l) file"
echo "   Audit backups: $(find $BACKUP_DIR/audit -name "audit_logs_*.sql.*" | wc -l) file"

# Spazio utilizzato
total_size=$(du -sh $BACKUP_DIR | cut -f1)
echo "   Spazio totale: $total_size"

# Riepilogo finale
total_errors=$((daily_status + weekly_status + monthly_status + audit_status))

if [ $total_errors -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}BACKUP COMPLETATO CON SUCCESSO${NC}"
    echo "[$TIMESTAMP] 🎉 Backup completato con successo (0 errori)" >> $LOG_FILE
else
    echo -e "\n⚠️ ${YELLOW}BACKUP COMPLETATO CON $total_errors ERRORI${NC}"
    echo "[$TIMESTAMP] ⚠️ Backup completato con $total_errors errori" >> $LOG_FILE
fi

echo "[$TIMESTAMP] === BACKUP DATABASE TERMINATO ===" >> $LOG_FILE

exit $total_errors
```

### 2. Backup Incrementale

Creare `scripts/backup-incremental.sh`:

```bash
#!/bin/bash

# Backup incrementale basato su WAL (Write-Ahead Logging)
BACKUP_DIR="./backups/incremental"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup-incremental.log"

echo "[$TIMESTAMP] === BACKUP INCREMENTALE AVVIATO ===" | tee -a $LOG_FILE

# Creazione directory
mkdir -p $BACKUP_DIR

# Backup delle modifiche recenti (ultime 4 ore)
incremental_file="$BACKUP_DIR/incremental_${DATE}.sql"

# Query per dati modificati nelle ultime 4 ore
psql "$DATABASE_URL" << EOF > "$incremental_file"
-- Backup incrementale delle modifiche recenti

-- Person modificate
\copy (SELECT * FROM person WHERE updated_at >= NOW() - INTERVAL '4 hours' OR created_at >= NOW() - INTERVAL '4 hours') TO STDOUT WITH CSV HEADER;

-- PersonRole modificate
\copy (SELECT * FROM person_role WHERE updated_at >= NOW() - INTERVAL '4 hours' OR created_at >= NOW() - INTERVAL '4 hours') TO STDOUT WITH CSV HEADER;

-- Audit logs recenti
\copy (SELECT * FROM gdpr_audit_log WHERE created_at >= NOW() - INTERVAL '4 hours') TO STDOUT WITH CSV HEADER;

-- Consent records modificati
\copy (SELECT * FROM consent_record WHERE updated_at >= NOW() - INTERVAL '4 hours' OR created_at >= NOW() - INTERVAL '4 hours') TO STDOUT WITH CSV HEADER;
EOF

if [ $? -eq 0 ]; then
    gzip "$incremental_file"
    file_size=$(du -h "${incremental_file}.gz" | cut -f1)
    echo "✅ Backup incrementale completato: ${incremental_file}.gz (${file_size})"
    echo "[$TIMESTAMP] ✅ Backup incrementale completato: ${incremental_file}.gz (${file_size})" >> $LOG_FILE
    
    # Pulizia backup incrementali vecchi (mantieni 7 giorni)
    find $BACKUP_DIR -name "incremental_*.sql.gz" -mtime +7 -delete
    
    echo "[$TIMESTAMP] === BACKUP INCREMENTALE TERMINATO ===" >> $LOG_FILE
    exit 0
else
    echo "❌ Errore backup incrementale"
    echo "[$TIMESTAMP] ❌ Errore backup incrementale" >> $LOG_FILE
    rm -f "$incremental_file"
    exit 1
fi
```

## 📁 Backup File System

### 1. Script Backup Files

Creare `scripts/backup-files.sh`:

```bash
#!/bin/bash

# Backup file system
BACKUP_DIR="./backups/files"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup-files.log"

echo "[$TIMESTAMP] === BACKUP FILES AVVIATO ===" | tee -a $LOG_FILE

# Directory da includere nel backup
INCLUDE_DIRS=(
    "./uploads"
    "./storage"
    "./src"
    "./docs"
    "./scripts"
    "./config"
    "./.env*"
    "./package*.json"
    "./ecosystem.config.js"
    "./prisma"
)

# Directory da escludere
EXCLUDE_PATTERNS=(
    "node_modules"
    ".git"
    "logs"
    "backups"
    "tmp"
    "*.log"
    "*.tmp"
    ".DS_Store"
)

# Creazione directory backup
mkdir -p $BACKUP_DIR

# Costruzione comando rsync
RSYNC_CMD="rsync -av --progress"

# Aggiunta esclusioni
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    RSYNC_CMD="$RSYNC_CMD --exclude='$pattern'"
done

# Backup con rsync
backup_file="$BACKUP_DIR/files_backup_${DATE}.tar.gz"
temp_dir="/tmp/project_backup_${DATE}"

echo "Creazione backup files..."

# Creazione directory temporanea
mkdir -p "$temp_dir"

# Copia files con rsync
if $RSYNC_CMD . "$temp_dir/" > /dev/null 2>&1; then
    # Creazione archivio compresso
    if tar -czf "$backup_file" -C "$temp_dir" . 2>/dev/null; then
        # Pulizia directory temporanea
        rm -rf "$temp_dir"
        
        file_size=$(du -h "$backup_file" | cut -f1)
        echo "✅ Backup files completato: $backup_file (${file_size})"
        echo "[$TIMESTAMP] ✅ Backup files completato: $backup_file (${file_size})" >> $LOG_FILE
        
        # Test integrità archivio
        if tar -tzf "$backup_file" > /dev/null 2>&1; then
            echo "[$TIMESTAMP] ✅ Test integrità archivio: OK" >> $LOG_FILE
        else
            echo "[$TIMESTAMP] ❌ Test integrità archivio: FALLITO" >> $LOG_FILE
        fi
        
        # Pulizia backup vecchi (mantieni 14 giorni)
        find $BACKUP_DIR -name "files_backup_*.tar.gz" -mtime +14 -delete
        
        echo "[$TIMESTAMP] === BACKUP FILES TERMINATO ===" >> $LOG_FILE
        exit 0
    else
        echo "❌ Errore creazione archivio"
        echo "[$TIMESTAMP] ❌ Errore creazione archivio" >> $LOG_FILE
        rm -rf "$temp_dir"
        exit 1
    fi
else
    echo "❌ Errore copia files"
    echo "[$TIMESTAMP] ❌ Errore copia files con rsync" >> $LOG_FILE
    rm -rf "$temp_dir"
    exit 1
fi
```

### 2. Backup Configurazioni

Creare `scripts/backup-config.sh`:

```bash
#!/bin/bash

# Backup configurazioni sensibili
BACKUP_DIR="./backups/config"
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup-config.log"

echo "[$TIMESTAMP] === BACKUP CONFIGURAZIONI AVVIATO ===" | tee -a $LOG_FILE

# Creazione directory backup
mkdir -p $BACKUP_DIR

# File di configurazione da salvare
CONFIG_FILES=(
    ".env"
    ".env.production"
    ".env.staging"
    "ecosystem.config.js"
    "package.json"
    "package-lock.json"
    "prisma/schema.prisma"
    "nginx.conf"
    "docker-compose.yml"
)

# Directory temporanea per backup
temp_dir="/tmp/config_backup_${DATE}"
mkdir -p "$temp_dir"

echo "Backup configurazioni..."

# Copia file di configurazione
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Crea directory se necessaria
        mkdir -p "$temp_dir/$(dirname "$file")"
        
        # Copia file
        cp "$file" "$temp_dir/$file"
        echo "  ✓ $file"
    else
        echo "  ⚠ $file (non trovato)"
    fi
done

# Backup configurazioni PM2
if command -v pm2 >/dev/null 2>&1; then
    pm2 save > /dev/null 2>&1
    if [ -f ~/.pm2/dump.pm2 ]; then
        cp ~/.pm2/dump.pm2 "$temp_dir/pm2_dump.pm2"
        echo "  ✓ PM2 configuration"
    fi
fi

# Backup configurazioni nginx (se esistenti)
if [ -f "/etc/nginx/sites-available/project-2.0" ]; then
    sudo cp "/etc/nginx/sites-available/project-2.0" "$temp_dir/nginx_site.conf" 2>/dev/null
    echo "  ✓ Nginx configuration"
fi

# Creazione archivio crittografato
config_backup_file="$BACKUP_DIR/config_backup_${DATE}.tar.gz"

if tar -czf "$config_backup_file" -C "$temp_dir" . 2>/dev/null; then
    # Crittografia se chiave disponibile
    if [ ! -z "$BACKUP_ENCRYPTION_KEY" ]; then
        encrypted_file="${config_backup_file}.enc"
        if openssl enc -aes-256-cbc -salt -in "$config_backup_file" -out "$encrypted_file" -k "$BACKUP_ENCRYPTION_KEY" 2>/dev/null; then
            rm "$config_backup_file"
            config_backup_file="$encrypted_file"
            echo "  ✓ Configurazioni crittografate"
        fi
    fi
    
    # Pulizia directory temporanea
    rm -rf "$temp_dir"
    
    file_size=$(du -h "$config_backup_file" | cut -f1)
    echo "✅ Backup configurazioni completato: $config_backup_file (${file_size})"
    echo "[$TIMESTAMP] ✅ Backup configurazioni completato: $config_backup_file (${file_size})" >> $LOG_FILE
    
    # Pulizia backup vecchi (mantieni 30 giorni)
    find $BACKUP_DIR -name "config_backup_*" -mtime +30 -delete
    
    echo "[$TIMESTAMP] === BACKUP CONFIGURAZIONI TERMINATO ===" >> $LOG_FILE
    exit 0
else
    echo "❌ Errore creazione backup configurazioni"
    echo "[$TIMESTAMP] ❌ Errore creazione backup configurazioni" >> $LOG_FILE
    rm -rf "$temp_dir"
    exit 1
fi
```

## 🔄 Procedure di Restore

### 1. Restore Database

Creare `scripts/restore-database.sh`:

```bash
#!/bin/bash

# Script restore database
BACKUP_DIR="./backups/database"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/restore.log"

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "[$TIMESTAMP] === RESTORE DATABASE AVVIATO ===" | tee -a $LOG_FILE

# Funzione per mostrare backup disponibili
show_available_backups() {
    echo "📋 Backup disponibili:"
    echo
    
    echo "🗓️ Daily Backups:"
    find $BACKUP_DIR/daily -name "db_daily_*.sql.*" -printf "%T@ %Tc %p\n" 2>/dev/null | sort -nr | head -10 | while read timestamp date time file; do
        size=$(du -h "$file" | cut -f1)
        echo "  $(basename "$file") - $date $time ($size)"
    done
    
    echo
    echo "📅 Weekly Backups:"
    find $BACKUP_DIR/weekly -name "db_weekly_*.sql.*" -printf "%T@ %Tc %p\n" 2>/dev/null | sort -nr | head -5 | while read timestamp date time file; do
        size=$(du -h "$file" | cut -f1)
        echo "  $(basename "$file") - $date $time ($size)"
    done
    
    echo
    echo "📆 Monthly Backups:"
    find $BACKUP_DIR/monthly -name "db_monthly_*.sql.*" -printf "%T@ %Tc %p\n" 2>/dev/null | sort -nr | head -5 | while read timestamp date time file; do
        size=$(du -h "$file" | cut -f1)
        echo "  $(basename "$file") - $date $time ($size)"
    done
}

# Funzione per restore
perform_restore() {
    local backup_file=$1
    local restore_db_name="${2:-project_2_0_db_restore_$(date +%Y%m%d_%H%M%S)}"
    
    echo "🔄 Avvio restore da: $(basename "$backup_file")"
    echo "📊 Database destinazione: $restore_db_name"
    
    # Verifica esistenza file
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ ERRORE: File backup non trovato${NC}"
        return 1
    fi
    
    # Determina tipo file e prepara per restore
    local temp_sql_file="/tmp/restore_$(date +%Y%m%d_%H%M%S).sql"
    
    if [[ "$backup_file" == *.enc ]]; then
        # File crittografato
        if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
            echo -e "${RED}❌ ERRORE: Chiave crittografia non configurata${NC}"
            return 1
        fi
        
        echo "🔓 Decrittografia backup..."
        if ! openssl enc -aes-256-cbc -d -in "$backup_file" -out "${temp_sql_file}.gz" -k "$BACKUP_ENCRYPTION_KEY" 2>/dev/null; then
            echo -e "${RED}❌ ERRORE: Decrittografia fallita${NC}"
            return 1
        fi
        
        echo "📦 Decompressione backup..."
        if ! gunzip "${temp_sql_file}.gz" 2>/dev/null; then
            echo -e "${RED}❌ ERRORE: Decompressione fallita${NC}"
            rm -f "${temp_sql_file}.gz"
            return 1
        fi
    elif [[ "$backup_file" == *.gz ]]; then
        # File compresso
        echo "📦 Decompressione backup..."
        if ! gunzip -c "$backup_file" > "$temp_sql_file" 2>/dev/null; then
            echo -e "${RED}❌ ERRORE: Decompressione fallita${NC}"
            return 1
        fi
    else
        # File SQL non compresso
        cp "$backup_file" "$temp_sql_file"
    fi
    
    # Creazione database di restore
    echo "🗄️ Creazione database di restore..."
    if ! createdb "$restore_db_name" 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Database già esistente o errore creazione${NC}"
    fi
    
    # Restore database
    echo "⚡ Esecuzione restore..."
    restore_db_url=$(echo "$DATABASE_URL" | sed "s|/[^/]*$|/$restore_db_name|")
    
    if psql "$restore_db_url" < "$temp_sql_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Restore completato con successo${NC}"
        echo "[$TIMESTAMP] ✅ Restore completato: $backup_file -> $restore_db_name" >> $LOG_FILE
        
        # Verifica integrità
        echo "🔍 Verifica integrità..."
        person_count=$(psql "$restore_db_url" -t -c "SELECT COUNT(*) FROM person WHERE deletedAt IS NULL;" 2>/dev/null | tr -d ' ')
        audit_count=$(psql "$restore_db_url" -t -c "SELECT COUNT(*) FROM gdpr_audit_log;" 2>/dev/null | tr -d ' ')
        
        echo "   • Person attive: $person_count"
        echo "   • Audit logs: $audit_count"
        
        echo
        echo -e "${GREEN}🎉 RESTORE COMPLETATO${NC}"
        echo "📊 Database ripristinato: $restore_db_name"
        echo "🔗 Connection string: $restore_db_url"
        echo
        echo -e "${YELLOW}⚠️ IMPORTANTE:${NC}"
        echo "   1. Verificare i dati ripristinati"
        echo "   2. Se tutto OK, sostituire database principale"
        echo "   3. Riavviare servizi (CON AUTORIZZAZIONE)"
        
    else
        echo -e "${RED}❌ ERRORE durante restore${NC}"
        echo "[$TIMESTAMP] ❌ Errore restore: $backup_file" >> $LOG_FILE
        dropdb "$restore_db_name" 2>/dev/null
    fi
    
    # Pulizia file temporanei
    rm -f "$temp_sql_file"
}

# Menu interattivo
if [ $# -eq 0 ]; then
    show_available_backups
    echo
    echo "💡 Utilizzo:"
    echo "   $0 <path_backup_file> [nome_database_destinazione]"
    echo
    echo "📝 Esempi:"
    echo "   $0 ./backups/database/daily/db_daily_20250125_120000.sql.gz"
    echo "   $0 ./backups/database/weekly/db_weekly_20250120_000000.sql.gz.enc custom_restore_db"
    exit 0
fi

# Esecuzione restore
backup_file=$1
restore_db_name=$2

# Conferma utente
echo -e "${YELLOW}⚠️ ATTENZIONE: Stai per eseguire un restore database${NC}"
echo "📁 File backup: $backup_file"
echo "🗄️ Database destinazione: ${restore_db_name:-auto-generato}"
echo
read -p "Continuare? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    perform_restore "$backup_file" "$restore_db_name"
else
    echo "Operazione annullata"
    exit 0
fi

echo "[$TIMESTAMP] === RESTORE DATABASE TERMINATO ===" >> $LOG_FILE
```

### 2. Restore Files

Creare `scripts/restore-files.sh`:

```bash
#!/bin/bash

# Script restore files
BACKUP_DIR="./backups/files"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/restore.log"

echo "[$TIMESTAMP] === RESTORE FILES AVVIATO ===" | tee -a $LOG_FILE

# Mostra backup disponibili
show_file_backups() {
    echo "📋 Backup files disponibili:"
    find $BACKUP_DIR -name "files_backup_*.tar.gz" -printf "%T@ %Tc %p\n" 2>/dev/null | sort -nr | head -10 | while read timestamp date time file; do
        size=$(du -h "$file" | cut -f1)
        echo "  $(basename "$file") - $date $time ($size)"
    done
}

# Funzione restore files
restore_files() {
    local backup_file=$1
    local restore_dir="${2:-./restore_$(date +%Y%m%d_%H%M%S)}"
    
    echo "🔄 Restore files da: $(basename "$backup_file")"
    echo "📁 Directory destinazione: $restore_dir"
    
    # Verifica file backup
    if [ ! -f "$backup_file" ]; then
        echo "❌ ERRORE: File backup non trovato"
        return 1
    fi
    
    # Creazione directory restore
    mkdir -p "$restore_dir"
    
    # Test integrità archivio
    echo "🔍 Verifica integrità archivio..."
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        echo "❌ ERRORE: Archivio corrotto"
        return 1
    fi
    
    # Estrazione archivio
    echo "📦 Estrazione files..."
    if tar -xzf "$backup_file" -C "$restore_dir" 2>/dev/null; then
        echo "✅ Files ripristinati in: $restore_dir"
        echo "[$TIMESTAMP] ✅ Restore files completato: $backup_file -> $restore_dir" >> $LOG_FILE
        
        # Statistiche restore
        file_count=$(find "$restore_dir" -type f | wc -l)
        total_size=$(du -sh "$restore_dir" | cut -f1)
        
        echo "📊 Statistiche restore:"
        echo "   • Files ripristinati: $file_count"
        echo "   • Dimensione totale: $total_size"
        
        return 0
    else
        echo "❌ ERRORE durante estrazione"
        echo "[$TIMESTAMP] ❌ Errore restore files: $backup_file" >> $LOG_FILE
        rm -rf "$restore_dir"
        return 1
    fi
}

# Menu o esecuzione diretta
if [ $# -eq 0 ]; then
    show_file_backups
    echo
    echo "💡 Utilizzo:"
    echo "   $0 <path_backup_file> [directory_destinazione]"
    exit 0
fi

backup_file=$1
restore_dir=$2

# Conferma utente
echo "⚠️ ATTENZIONE: Stai per ripristinare files"
echo "📁 File backup: $backup_file"
echo "📂 Directory destinazione: ${restore_dir:-auto-generata}"
echo
read -p "Continuare? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    restore_files "$backup_file" "$restore_dir"
else
    echo "Operazione annullata"
fi

echo "[$TIMESTAMP] === RESTORE FILES TERMINATO ===" >> $LOG_FILE
```

## 🔄 Automazione Backup

### 1. Script Master Backup

Creare `scripts/backup-all.sh`:

```bash
#!/bin/bash

# Script master per tutti i backup
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup-master.log"

echo "[$TIMESTAMP] === BACKUP COMPLETO AVVIATO ===" | tee -a $LOG_FILE

# Contatori
total_backups=0
successful_backups=0
failed_backups=0

# Funzione per eseguire backup con logging
run_backup() {
    local script_name=$1
    local description=$2
    
    echo "🔄 $description..."
    total_backups=$((total_backups + 1))
    
    if ./scripts/$script_name; then
        echo "✅ $description completato"
        echo "[$TIMESTAMP] ✅ $description: OK" >> $LOG_FILE
        successful_backups=$((successful_backups + 1))
    else
        echo "❌ $description fallito"
        echo "[$TIMESTAMP] ❌ $description: ERRORE" >> $LOG_FILE
        failed_backups=$((failed_backups + 1))
    fi
    echo
}

# Esecuzione backup in sequenza
run_backup "backup-database.sh" "Backup Database"
run_backup "backup-files.sh" "Backup Files"
run_backup "backup-config.sh" "Backup Configurazioni"

# Backup logs
echo "🔄 Backup Logs..."
total_backups=$((total_backups + 1))

logs_backup_dir="./backups/logs"
logs_backup_file="$logs_backup_dir/logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
mkdir -p "$logs_backup_dir"

if tar -czf "$logs_backup_file" logs/ --exclude='*.tmp' 2>/dev/null; then
    # Pulizia backup logs vecchi (mantieni 30 giorni)
    find "$logs_backup_dir" -name "logs_backup_*.tar.gz" -mtime +30 -delete
    
    echo "✅ Backup Logs completato"
    echo "[$TIMESTAMP] ✅ Backup Logs: OK" >> $LOG_FILE
    successful_backups=$((successful_backups + 1))
else
    echo "❌ Backup Logs fallito"
    echo "[$TIMESTAMP] ❌ Backup Logs: ERRORE" >> $LOG_FILE
    failed_backups=$((failed_backups + 1))
fi

echo

# Riepilogo finale
echo "📊 Riepilogo Backup Completo:"
echo "   • Backup totali: $total_backups"
echo "   • Successi: $successful_backups"
echo "   • Fallimenti: $failed_backups"

# Calcolo spazio utilizzato
total_backup_size=$(du -sh ./backups 2>/dev/null | cut -f1 || echo "N/A")
echo "   • Spazio backup: $total_backup_size"

if [ $failed_backups -eq 0 ]; then
    echo "🎉 TUTTI I BACKUP COMPLETATI CON SUCCESSO"
    echo "[$TIMESTAMP] 🎉 Backup completo: $successful_backups/$total_backups successi" >> $LOG_FILE
    exit_code=0
else
    echo "⚠️ BACKUP COMPLETATO CON $failed_backups ERRORI"
    echo "[$TIMESTAMP] ⚠️ Backup completo: $successful_backups/$total_backups successi, $failed_backups errori" >> $LOG_FILE
    exit_code=1
fi

echo "[$TIMESTAMP] === BACKUP COMPLETO TERMINATO ===" >> $LOG_FILE

exit $exit_code
```

### 2. Configurazione Cron

```bash
# Aggiungere a crontab (crontab -e)

# Backup completo giornaliero alle 2:00
0 2 * * * /path/to/project/scripts/backup-all.sh >> /path/to/project/logs/cron-backup.log 2>&1

# Backup incrementale ogni 4 ore
0 */4 * * * /path/to/project/scripts/backup-incremental.sh >> /path/to/project/logs/cron-incremental.log 2>&1

# Backup configurazioni ogni domenica alle 3:00
0 3 * * 0 /path/to/project/scripts/backup-config.sh >> /path/to/project/logs/cron-config.log 2>&1

# Verifica integrità backup settimanale
0 4 * * 1 /path/to/project/scripts/verify-backups.sh >> /path/to/project/logs/cron-verify.log 2>&1
```

## 🔒 Sicurezza Backup

### 1. Crittografia

```bash
# Configurazione chiave crittografia
export BACKUP_ENCRYPTION_KEY="your-very-secure-encryption-key-here"

# Crittografia file
openssl enc -aes-256-cbc -salt -in backup.sql -out backup.sql.enc -k "$BACKUP_ENCRYPTION_KEY"

# Decrittografia file
openssl enc -aes-256-cbc -d -in backup.sql.enc -out backup.sql -k "$BACKUP_ENCRYPTION_KEY"
```

### 2. Verifica Integrità

Creare `scripts/verify-backups.sh`:

```bash
#!/bin/bash

# Verifica integrità backup
BACKUP_DIR="./backups"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="./logs/backup-verify.log"

echo "[$TIMESTAMP] === VERIFICA INTEGRITÀ BACKUP ===" | tee -a $LOG_FILE

# Verifica backup database
echo "🔍 Verifica backup database..."
db_backups_ok=0
db_backups_total=0

for backup_file in $(find $BACKUP_DIR/database -name "*.sql.gz" -mtime -7); do
    db_backups_total=$((db_backups_total + 1))
    if gzip -t "$backup_file" 2>/dev/null; then
        db_backups_ok=$((db_backups_ok + 1))
        echo "  ✅ $(basename "$backup_file")"
    else
        echo "  ❌ $(basename "$backup_file") - CORROTTO"
        echo "[$TIMESTAMP] ❌ Backup corrotto: $backup_file" >> $LOG_FILE
    fi
done

# Verifica backup files
echo "🔍 Verifica backup files..."
file_backups_ok=0
file_backups_total=0

for backup_file in $(find $BACKUP_DIR/files -name "*.tar.gz" -mtime -7); do
    file_backups_total=$((file_backups_total + 1))
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        file_backups_ok=$((file_backups_ok + 1))
        echo "  ✅ $(basename "$backup_file")"
    else
        echo "  ❌ $(basename "$backup_file") - CORROTTO"
        echo "[$TIMESTAMP] ❌ Backup corrotto: $backup_file" >> $LOG_FILE
    fi
done

# Riepilogo
echo
echo "📊 Risultati verifica:"
echo "   • Database: $db_backups_ok/$db_backups_total OK"
echo "   • Files: $file_backups_ok/$file_backups_total OK"

total_ok=$((db_backups_ok + file_backups_ok))
total_backups=$((db_backups_total + file_backups_total))

if [ $total_ok -eq $total_backups ]; then
    echo "🎉 TUTTI I BACKUP SONO INTEGRI"
    echo "[$TIMESTAMP] ✅ Verifica integrità: $total_ok/$total_backups backup OK" >> $LOG_FILE
else
    echo "⚠️ RILEVATI BACKUP CORROTTI"
    echo "[$TIMESTAMP] ⚠️ Verifica integrità: $total_ok/$total_backups backup OK" >> $LOG_FILE
fi

echo "[$TIMESTAMP] === VERIFICA INTEGRITÀ TERMINATA ===" >> $LOG_FILE
```

## 📋 Checklist Backup/Restore

### Setup Iniziale
- [ ] Script backup configurati e testati
- [ ] Directory backup create con permessi corretti
- [ ] Cron jobs configurati
- [ ] Chiave crittografia configurata (se necessaria)
- [ ] Test restore eseguito con successo
- [ ] Monitoraggio backup attivo

### Controlli Giornalieri
- [ ] Verifica esecuzione backup automatici
- [ ] Controllo logs backup per errori
- [ ] Verifica spazio disco backup
- [ ] Test health check sistema

### Controlli Settimanali
- [ ] Verifica integrità backup
- [ ] Test restore su database di test
- [ ] Pulizia backup vecchi
- [ ] Controllo retention policies

### Controlli Mensili
- [ ] Test restore completo
- [ ] Verifica procedure disaster recovery
- [ ] Aggiornamento documentazione
- [ ] Review politiche backup

---

**⚠️ Importante**: I backup sono essenziali per la continuità operativa e la compliance GDPR. Testare regolarmente le procedure di restore e mantenere sempre backup aggiornati. Per operazioni di restore in produzione, richiedere sempre autorizzazione al proprietario del progetto.