#!/bin/bash

# ElementMedica Production Backup Script
# Automated PostgreSQL backup with rotation and compression
# Version: 2.0
# Author: ElementSoftware Medica

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="elementmedica_backup_${DATE}"
RETENTION_DAYS=30
COMPRESSION_LEVEL=6

# Database configuration from environment
DB_HOST="postgres"
DB_PORT="5432"
DB_NAME="${POSTGRES_DB:-elementmedica}"
DB_USER="${POSTGRES_USER:-postgres}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/backup.log"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR" || error_exit "Cannot create backup directory: $BACKUP_DIR"
fi

# Check database connectivity
log "Checking database connectivity..."
pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" || error_exit "Database is not accessible"

# Create backup
log "Starting backup: $BACKUP_NAME"
start_time=$(date +%s)

# Full database backup with custom format
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --compress="$COMPRESSION_LEVEL" \
    --verbose \
    --file="${BACKUP_DIR}/${BACKUP_NAME}.dump" \
    || error_exit "pg_dump failed"

# Create SQL backup for easier restore
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=plain \
    --verbose \
    --file="${BACKUP_DIR}/${BACKUP_NAME}.sql" \
    || error_exit "SQL backup failed"

# Compress SQL backup
gzip "${BACKUP_DIR}/${BACKUP_NAME}.sql" || error_exit "Compression failed"

# Calculate backup time and size
end_time=$(date +%s)
backup_time=$((end_time - start_time))
dump_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.dump" | cut -f1)
sql_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.sql.gz" | cut -f1)

log "Backup completed successfully!"
log "Duration: ${backup_time} seconds"
log "Custom dump size: $dump_size"
log "SQL backup size: $sql_size"

# Create backup metadata
cat > "${BACKUP_DIR}/${BACKUP_NAME}.meta" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -Iseconds)",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "duration_seconds": $backup_time,
  "dump_size": "$dump_size",
  "sql_size": "$sql_size",
  "compression_level": $COMPRESSION_LEVEL,
  "format": "custom+sql",
  "retention_days": $RETENTION_DAYS
}
EOF

# Verify backup integrity
log "Verifying backup integrity..."
pg_restore --list "${BACKUP_DIR}/${BACKUP_NAME}.dump" > /dev/null || error_exit "Backup verification failed"
log "Backup verification successful"

# Cleanup old backups
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "elementmedica_backup_*.dump" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "elementmedica_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "elementmedica_backup_*.meta" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
backup_count=$(find "$BACKUP_DIR" -name "elementmedica_backup_*.dump" -type f | wc -l)
log "Cleanup completed. Remaining backups: $backup_count"

# Create latest symlink
ln -sf "${BACKUP_NAME}.dump" "${BACKUP_DIR}/latest.dump"
ln -sf "${BACKUP_NAME}.sql.gz" "${BACKUP_DIR}/latest.sql.gz"
ln -sf "${BACKUP_NAME}.meta" "${BACKUP_DIR}/latest.meta"

log "Backup process completed successfully: $BACKUP_NAME"

# Optional: Send notification (uncomment if needed)
# if command -v curl >/dev/null 2>&1; then
#     curl -X POST "$WEBHOOK_URL" \
#         -H "Content-Type: application/json" \
#         -d "{
#             \"text\": \"✅ ElementMedica backup completed: $BACKUP_NAME\",
#             \"details\": {
#                 \"duration\": \"${backup_time}s\",
#                 \"size\": \"$dump_size\",
#                 \"timestamp\": \"$(date -Iseconds)\"
#             }
#         }" || log "Warning: Notification webhook failed"
# fi

exit 0