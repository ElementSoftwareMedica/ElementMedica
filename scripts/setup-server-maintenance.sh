#!/usr/bin/env bash
# =============================================================================
# ElementMedica — Server Maintenance & Log Rotation Setup
# =============================================================================
# Run this ONCE on the production server to configure:
#   1. logrotate for Nginx access/error logs
#   2. logrotate for PM2 app logs
#   3. pm2-logrotate module (PM2 native log capping)
#   4. Daily cron: clean Puppeteer /tmp files & stale Chromium sockets
#   5. Weekly cron: vacuum stale temp uploads older than 7 days
#
# Usage:
#   ssh root@178.104.44.177 "bash -s" < scripts/setup-server-maintenance.sh
# Or via deploy script:
#   scp scripts/setup-server-maintenance.sh root@178.104.44.177:/tmp/
#   ssh root@178.104.44.177 "bash /tmp/setup-server-maintenance.sh"
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[MAINTENANCE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# =============================================================================
# 1. NGINX LOG ROTATION
# =============================================================================
log "Configuring Nginx logrotate..."

cat > /etc/logrotate.d/nginx-elementmedica <<'EOF'
# ElementMedica custom Nginx log rotation
# Rotate daily, keep 14 days, compress older, notify Nginx to reopen log files

/var/log/nginx/elementsicurezza.access.log
/var/log/nginx/elementmedica.access.log
/var/log/nginx/fallback.access.log
/var/log/nginx/error.log
/var/log/nginx/access.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        # Signal Nginx to reopen log files after rotation
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 "$(cat /var/run/nginx.pid)" 2>/dev/null || true
        fi
    endscript
}
EOF

log "Nginx logrotate config written to /etc/logrotate.d/nginx-elementmedica"

# Run once now to process any existing oversized logs
logrotate -f /etc/logrotate.d/nginx-elementmedica 2>/dev/null || warn "logrotate dry run had warnings (normal on first run)"

# =============================================================================
# 2. PM2 APP LOG ROTATION
# =============================================================================
log "Configuring PM2 app log logrotate..."

mkdir -p /var/www/elementmedica/logs

cat > /etc/logrotate.d/elementmedica-pm2 <<'EOF'
# ElementMedica PM2 application log rotation
# PM2 writes to these files directly; rotate weekly, keep 8 weeks

/var/www/elementmedica/logs/api-out.log
/var/www/elementmedica/logs/api-error.log
/var/www/elementmedica/logs/docs-out.log
/var/www/elementmedica/logs/docs-error.log {
    weekly
    missingok
    rotate 8
    compress
    delaycompress
    notifempty
    copytruncate
    # copytruncate: copy + truncate instead of move so PM2 doesn't lose the FD
}
EOF

log "PM2 app log logrotate config written to /etc/logrotate.d/elementmedica-pm2"

# =============================================================================
# 3. PM2 LOGROTATE MODULE (handles pm2 internal logs + per-process caps)
# =============================================================================
log "Installing pm2-logrotate module..."

# Install if pm2 is available
if command -v pm2 &>/dev/null; then
    pm2 install pm2-logrotate 2>/dev/null || warn "pm2-logrotate already installed or pm2 unavailable"
    pm2 set pm2-logrotate:max_size 50M       2>/dev/null || true
    pm2 set pm2-logrotate:retain 10          2>/dev/null || true
    pm2 set pm2-logrotate:compress true      2>/dev/null || true
    pm2 set pm2-logrotate:rotateInterval '0 2 * * *'  2>/dev/null || true  # 2:00 AM daily
    pm2 set pm2-logrotate:dateFormat 'YYYY-MM-DD_HH-mm-ss'  2>/dev/null || true
    log "pm2-logrotate configured: 50MB cap, 10 rotations, compress, daily at 02:00"
else
    warn "pm2 not found — skipping pm2-logrotate setup (run manually if needed)"
fi

# =============================================================================
# 4. DAILY CRON: CLEAN PUPPETEER /TMP FILES
# =============================================================================
log "Installing daily Puppeteer /tmp cleanup cron..."

cat > /etc/cron.d/elementmedica-cleanup <<'EOF'
# ElementMedica server cleanup — runs as root
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily at 03:00: Remove Puppeteer/Chromium crash dumps and temp sockets
0 3 * * *  root  find /tmp -maxdepth 1 -name '.org.chromium.*' -mtime +0 -exec rm -rf {} + 2>/dev/null; \
                  find /tmp -maxdepth 1 -name 'puppeteer_*' -mtime +0 -exec rm -rf {} + 2>/dev/null; \
                  find /tmp -maxdepth 1 -name 'chrome_*' -mtime +0 -exec rm -rf {} + 2>/dev/null; \
                  find /tmp -maxdepth 1 -name '.com.google.Chrome.*' -mtime +0 -exec rm -rf {} + 2>/dev/null; true

# Weekly Sunday at 04:00: Remove temp upload files older than 7 days
0 4 * * 0  root  find /var/www/elementmedica/backend/temp -type f -mtime +7 -delete 2>/dev/null; true

# Monthly on 1st at 05:00: Clear old PM2 dumps and heap snapshots
0 5 1 * *  root  find /root/.pm2/logs -name '*.gz' -mtime +90 -delete 2>/dev/null; \
                  find /tmp -name 'heapdump-*' -mtime +1 -delete 2>/dev/null; true
EOF

chmod 644 /etc/cron.d/elementmedica-cleanup
log "Cleanup cron installed at /etc/cron.d/elementmedica-cleanup"

# =============================================================================
# 5. IMMEDIATE CLEANUP (free space now)
# =============================================================================
log "Running immediate cleanup..."

# Truncate oversized PM2 logs (preserve the last 5000 lines)
for f in /var/www/elementmedica/logs/*.log; do
    if [ -f "$f" ]; then
        lines=$(wc -l < "$f" 2>/dev/null || echo 0)
        if [ "$lines" -gt 10000 ]; then
            tail -n 5000 "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
            log "Truncated $f from ${lines} → 5000 lines"
        fi
    fi
done

# Remove Puppeteer leftover temp dirs
find /tmp -maxdepth 1 -name '.org.chromium.*' -exec rm -rf {} + 2>/dev/null || true
find /tmp -maxdepth 1 -name 'puppeteer_*' -exec rm -rf {} + 2>/dev/null || true
find /tmp -maxdepth 1 -name 'chrome_*' -exec rm -rf {} + 2>/dev/null || true

# Clean old temp upload files
if [ -d /var/www/elementmedica/backend/temp ]; then
    find /var/www/elementmedica/backend/temp -type f -mtime +7 -delete 2>/dev/null || true
fi

# =============================================================================
# 6. REPORT DISK USAGE
# =============================================================================
log "Current disk usage after cleanup:"
df -h / 2>/dev/null || df -h
echo ""
log "Top 10 largest directories in /var/www/elementmedica:"
du -sh /var/www/elementmedica/*/ 2>/dev/null | sort -rh | head -10 || true
echo ""
log "Top 10 largest in /var/log:"
du -sh /var/log/* 2>/dev/null | sort -rh | head -10 || true

echo ""
log "✅ Server maintenance setup complete."
log "   Nginx logs → rotate daily, keep 14 days, compressed"
log "   PM2 logs   → rotate weekly, keep 8 weeks, copytruncate"
log "   pm2-logrotate → 50MB cap per file, rotate daily at 02:00"
log "   Puppeteer /tmp cleanup → daily at 03:00"
log "   Temp uploads cleanup → weekly Sunday at 04:00"
echo ""
warn "NEXT STEPS:"
warn "  1. Deploy updated nginx config: scp nginx/elementmedica-multi.conf root@178.104.44.177:/etc/nginx/sites-available/"
warn "  2. Reload nginx: ssh root@178.104.44.177 'nginx -t && systemctl reload nginx'"
warn "  3. Reload PM2: ssh root@178.104.44.177 'pm2 reload ecosystem.config.js'"
