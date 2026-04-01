#!/bin/bash
# =============================================================================
# ElementMedica — Server Disk Maintenance Script
# =============================================================================
# Installed on VPS at: /opt/elementmedica/server-maintenance.sh
# Cron (root crontab on VPS):
#   0 3 * * 0 /opt/elementmedica/server-maintenance.sh >> /var/log/elementmedica-cleanup.log 2>&1
# Safe to run manually: bash /opt/elementmedica/server-maintenance.sh [--dry-run]
# =============================================================================

LOG="/var/log/elementmedica-cleanup.log"
DRY_RUN=false
[ "$1" = "--dry-run" ] && DRY_RUN=true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== ElementMedica Maintenance START ==="
BEFORE=$(df -h / | awk "NR==2{print $4}")
log "Disk free before: $BEFORE"

run() {
  if $DRY_RUN; then log "DRY-RUN: $*"; else eval "$@" && log "OK: $*" || log "WARN: $* failed"; fi
}

# 1. Snap download cache (3GB+ growth, safe to delete)
run "rm -rf /var/lib/snapd/cache/*"

# 2. Puppeteer browser cache root (re-downloaded at server start)
run "rm -rf /root/.cache/puppeteer"

# 3. Puppeteer browser cache elementmedica user
run "rm -rf /home/elementmedica/.cache/puppeteer"

# 4. npm caches (both users)
run "rm -rf /root/.npm /home/elementmedica/.npm"

# 5. apt package archive cache
run "apt-get clean -y 2>/dev/null"

# 6. Truncate PM2 logs (keep last 10MB)
[ -f /root/.pm2/pm2.log ] && run "tail -c 10M /root/.pm2/pm2.log > /tmp/pm2.log.tmp && mv /tmp/pm2.log.tmp /root/.pm2/pm2.log"
[ -f /home/elementmedica/.pm2/pm2.log ] && run "tail -c 5M /home/elementmedica/.pm2/pm2.log > /tmp/pm2el.log.tmp && mv /tmp/pm2el.log.tmp /home/elementmedica/.pm2/pm2.log"

# 7. Remove temp files older than 7 days
run "find /tmp -type f -mtime +7 -delete 2>/dev/null"

# 8. Remove old webroot archives
run "rm -f /webroot/*.tar.gz /webroot/*.tar.bz2 /webroot/*.zip"

# 9. Truncate nginx access log if >500MB
if [ -f /var/log/nginx/access.log ]; then
    SIZE=$(stat -c%s /var/log/nginx/access.log 2>/dev/null || echo 0)
    [ "$SIZE" -gt 524288000 ] && run "tail -c 20M /var/log/nginx/access.log > /tmp/nginx_acc.tmp && mv /tmp/nginx_acc.tmp /var/log/nginx/access.log"
fi

AFTER=$(df -h / | awk "NR==2{print $4}")
log "Disk free after:  $AFTER"
log "=== ElementMedica Maintenance END ==="
