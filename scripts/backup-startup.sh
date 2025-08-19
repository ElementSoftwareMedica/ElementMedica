#!/bin/bash

# ElementMedica 2.0 - Startup Backup Script
# Backup automatico per configurazione economica (€4.78/mese)
# Target: Hetzner CX11 + Supabase + Cloudflare R2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="elementmedica"
APP_DIR="/home/$APP_NAME/app"
BACKUP_DIR="/home/$APP_NAME/backups"
LOG_DIR="/home/$APP_NAME/logs"
BACKUP_LOG="$LOG_DIR/backup.log"
MAX_LOCAL_BACKUPS=7
MAX_REMOTE_BACKUPS=30
COMPRESSION_LEVEL=6

# Load environment variables
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
fi

# Functions
log_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$BACKUP_LOG"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    log_message "SUCCESS: $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log_message "WARNING: $1"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    log_message "ERROR: $1"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log_message "INFO: $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking backup prerequisites..."
    
    # Create directories if they don't exist
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    
    # Check if app directory exists
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        exit 1
    fi
    
    # Check available disk space (need at least 1GB free)
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [ "$available_space" -lt "$required_space" ]; then
        print_error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create application backup
create_app_backup() {
    print_info "Creating application backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="app_backup_$timestamp"
    local backup_file="$BACKUP_DIR/$backup_name.tar.gz"
    
    # Create temporary directory for backup preparation
    local temp_dir="/tmp/elementmedica_backup_$timestamp"
    mkdir -p "$temp_dir"
    
    # Copy application files (excluding large/unnecessary files)
    rsync -av \
        --exclude='node_modules' \
        --exclude='logs' \
        --exclude='.git' \
        --exclude='temp' \
        --exclude='uploads' \
        --exclude='*.log' \
        --exclude='coverage' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='build' \
        "$APP_DIR/" "$temp_dir/app/"
    
    # Add system information
    cat > "$temp_dir/backup_info.txt" <<EOF
ElementMedica 2.0 - Backup Information
=====================================
Backup Date: $(date)
Hostname: $(hostname)
Server: Hetzner CX11 (Startup Configuration)
Budget: €4.78/mese
Node Version: $(node --version)
NPM Version: $(npm --version)
PM2 Version: $(pm2 --version)
Docker Version: $(docker --version)
Git Commit: $(cd "$APP_DIR" && git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(cd "$APP_DIR" && git branch --show-current 2>/dev/null || echo "N/A")
Backup Size: $(du -sh "$temp_dir" | cut -f1)
EOF
    
    # Add PM2 process list
    pm2 jlist > "$temp_dir/pm2_processes.json" 2>/dev/null || echo "[]" > "$temp_dir/pm2_processes.json"
    
    # Add Docker container status
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$temp_dir/docker_status.txt" 2>/dev/null || echo "Docker not available" > "$temp_dir/docker_status.txt"
    
    # Add system resource usage
    cat > "$temp_dir/system_info.txt" <<EOF
System Resource Usage at Backup Time
====================================
Memory Usage:
$(free -h)

Disk Usage:
$(df -h)

CPU Info:
$(cat /proc/loadavg)

Network Connections:
$(ss -tuln | head -20)
EOF
    
    # Create compressed backup
    tar -czf "$backup_file" -C "$temp_dir" . --warning=no-file-changed
    
    # Clean up temporary directory
    rm -rf "$temp_dir"
    
    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local backup_size=$(du -sh "$backup_file" | cut -f1)
        print_success "Application backup created: $backup_name.tar.gz ($backup_size)"
        echo "$backup_file"
    else
        print_error "Failed to create application backup"
        exit 1
    fi
}

# Create database backup
create_database_backup() {
    print_info "Creating database backup..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local db_backup_file="$BACKUP_DIR/db_backup_$timestamp.sql"
    
    # Check if Supabase credentials are available
    if [ -z "$DATABASE_URL" ]; then
        print_warning "DATABASE_URL not found, skipping database backup"
        return 0
    fi
    
    # Extract database connection details from DATABASE_URL
    # Format: postgresql://username:password@host:port/database
    local db_url="$DATABASE_URL"
    
    # Use pg_dump if available, otherwise use Supabase CLI
    if command -v pg_dump >/dev/null 2>&1; then
        # Direct pg_dump
        pg_dump "$db_url" > "$db_backup_file" 2>/dev/null
        
        if [ -f "$db_backup_file" ] && [ -s "$db_backup_file" ]; then
            # Compress the SQL file
            gzip "$db_backup_file"
            local backup_size=$(du -sh "$db_backup_file.gz" | cut -f1)
            print_success "Database backup created: db_backup_$timestamp.sql.gz ($backup_size)"
            echo "$db_backup_file.gz"
        else
            print_warning "Database backup failed or empty"
            rm -f "$db_backup_file"
        fi
    else
        print_warning "pg_dump not available, database backup skipped"
        print_info "Note: Supabase provides automatic backups in their dashboard"
    fi
}

# Upload to Cloudflare R2 (if configured)
upload_to_r2() {
    local backup_file="$1"
    local backup_name=$(basename "$backup_file")
    
    # Check if R2 credentials are configured
    if [ -z "$CLOUDFLARE_R2_ENDPOINT" ] || [ -z "$CLOUDFLARE_R2_ACCESS_KEY" ] || [ -z "$CLOUDFLARE_R2_SECRET_KEY" ] || [ -z "$CLOUDFLARE_R2_BUCKET" ]; then
        print_warning "Cloudflare R2 not configured, skipping remote backup"
        return 0
    fi
    
    print_info "Uploading backup to Cloudflare R2..."
    
    # Check if aws-cli is available
    if ! command -v aws >/dev/null 2>&1; then
        print_warning "AWS CLI not installed, skipping R2 upload"
        print_info "Install with: sudo apt install awscli"
        return 0
    fi
    
    # Configure AWS CLI for R2
    export AWS_ACCESS_KEY_ID="$CLOUDFLARE_R2_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$CLOUDFLARE_R2_SECRET_KEY"
    export AWS_DEFAULT_REGION="auto"
    
    # Upload to R2
    local r2_path="backups/$(date +%Y/%m)/$backup_name"
    
    if aws s3 cp "$backup_file" "s3://$CLOUDFLARE_R2_BUCKET/$r2_path" --endpoint-url="$CLOUDFLARE_R2_ENDPOINT"; then
        print_success "Backup uploaded to R2: $r2_path"
    else
        print_warning "Failed to upload backup to R2"
    fi
    
    # Clean up old remote backups (keep last 30)
    local old_backups=$(aws s3 ls "s3://$CLOUDFLARE_R2_BUCKET/backups/" --recursive --endpoint-url="$CLOUDFLARE_R2_ENDPOINT" | sort -k1,2 | head -n -$MAX_REMOTE_BACKUPS | awk '{print $4}')
    
    if [ -n "$old_backups" ]; then
        echo "$old_backups" | while read -r old_backup; do
            aws s3 rm "s3://$CLOUDFLARE_R2_BUCKET/$old_backup" --endpoint-url="$CLOUDFLARE_R2_ENDPOINT"
        done
        print_info "Cleaned up old remote backups"
    fi
}

# Clean up old local backups
cleanup_old_backups() {
    print_info "Cleaning up old local backups..."
    
    # Count current backups
    local backup_count=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt "$MAX_LOCAL_BACKUPS" ]; then
        local files_to_delete=$((backup_count - MAX_LOCAL_BACKUPS))
        
        # Delete oldest backups
        ls -1t "$BACKUP_DIR"/*.tar.gz | tail -n "$files_to_delete" | while read -r old_backup; do
            rm -f "$old_backup"
            print_info "Deleted old backup: $(basename "$old_backup")"
        done
        
        print_success "Cleaned up $files_to_delete old backup(s)"
    else
        print_info "No cleanup needed (${backup_count}/${MAX_LOCAL_BACKUPS} backups)"
    fi
    
    # Clean up old database backups
    local db_backup_count=$(ls -1 "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | wc -l)
    
    if [ "$db_backup_count" -gt "$MAX_LOCAL_BACKUPS" ]; then
        local db_files_to_delete=$((db_backup_count - MAX_LOCAL_BACKUPS))
        
        ls -1t "$BACKUP_DIR"/db_backup_*.sql.gz | tail -n "$db_files_to_delete" | while read -r old_db_backup; do
            rm -f "$old_db_backup"
            print_info "Deleted old database backup: $(basename "$old_db_backup")"
        done
        
        print_success "Cleaned up $db_files_to_delete old database backup(s)"
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    print_info "Verifying backup integrity..."
    
    # Test if tar file is valid
    if tar -tzf "$backup_file" >/dev/null 2>&1; then
        print_success "Backup integrity verified"
        return 0
    else
        print_error "Backup integrity check failed"
        return 1
    fi
}

# Send notification (if configured)
send_notification() {
    local status="$1"
    local message="$2"
    
    # Simple webhook notification (if configured)
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        curl -s -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"status\": \"$status\", \"message\": \"$message\", \"server\": \"$(hostname)\", \"timestamp\": \"$(date -Iseconds)\"}" \
            >/dev/null 2>&1 || true
    fi
    
    # Log to system log
    logger -t "elementmedica-backup" "$status: $message"
}

# Generate backup report
generate_report() {
    local start_time="$1"
    local end_time="$2"
    local app_backup="$3"
    local db_backup="$4"
    
    local duration=$((end_time - start_time))
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" <<EOF
ElementMedica 2.0 - Backup Report
=================================
Date: $(date)
Server: $(hostname)
Configuration: Startup (€4.78/mese)
Duration: ${duration}s

Backup Files:
$([ -n "$app_backup" ] && echo "✅ Application: $(basename "$app_backup") ($(du -sh "$app_backup" | cut -f1))" || echo "❌ Application: Failed")
$([ -n "$db_backup" ] && echo "✅ Database: $(basename "$db_backup") ($(du -sh "$db_backup" | cut -f1))" || echo "⚠️  Database: Skipped")

System Status:
Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
Disk: $(df "$BACKUP_DIR" | awk 'NR==2{print $5}')
Load: $(cat /proc/loadavg | cut -d' ' -f1-3)

Local Backups: $(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)/${MAX_LOCAL_BACKUPS}
Remote Backups: $([ -n "$CLOUDFLARE_R2_BUCKET" ] && echo "Enabled (R2)" || echo "Disabled")

Next Backup: $(date -d "+1 day" '+%Y-%m-%d %H:%M:%S')
EOF
    
    print_success "Backup report generated: $(basename "$report_file")"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    echo -e "\n${BLUE}🔄 ElementMedica 2.0 - Startup Backup${NC}"
    echo -e "${BLUE}💰 Budget: €4.78/mese | Server: Hetzner CX11${NC}"
    echo "================================================"
    
    log_message "Starting backup process"
    
    # Parse command line arguments
    local skip_db=false
    local skip_upload=false
    local verify_only=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-db)
                skip_db=true
                shift
                ;;
            --skip-upload)
                skip_upload=true
                shift
                ;;
            --verify-only)
                verify_only=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-db       Skip database backup"
                echo "  --skip-upload   Skip remote upload"
                echo "  --verify-only   Only verify existing backups"
                echo "  --help          Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Verify only mode
    if [ "$verify_only" = true ]; then
        print_info "Verifying existing backups..."
        local verified=0
        local failed=0
        
        for backup in "$BACKUP_DIR"/*.tar.gz; do
            if [ -f "$backup" ]; then
                if verify_backup "$backup"; then
                    ((verified++))
                else
                    ((failed++))
                fi
            fi
        done
        
        print_info "Verification complete: $verified verified, $failed failed"
        exit 0
    fi
    
    # Run backup process
    check_prerequisites
    
    # Create application backup
    local app_backup
    app_backup=$(create_app_backup)
    
    # Verify application backup
    if ! verify_backup "$app_backup"; then
        print_error "Application backup verification failed"
        exit 1
    fi
    
    # Create database backup
    local db_backup=""
    if [ "$skip_db" = false ]; then
        db_backup=$(create_database_backup)
    fi
    
    # Upload to remote storage
    if [ "$skip_upload" = false ] && [ -n "$app_backup" ]; then
        upload_to_r2 "$app_backup"
        
        if [ -n "$db_backup" ]; then
            upload_to_r2 "$db_backup"
        fi
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    local end_time=$(date +%s)
    
    # Generate report
    generate_report "$start_time" "$end_time" "$app_backup" "$db_backup"
    
    # Send notification
    local duration=$((end_time - start_time))
    send_notification "success" "Backup completed successfully in ${duration}s"
    
    log_message "Backup process completed successfully"
    
    echo -e "\n${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${BLUE}📊 Summary:${NC}"
    echo -e "  • Duration: ${duration}s"
    echo -e "  • Application backup: $([ -n "$app_backup" ] && basename "$app_backup" || "Failed")"
    echo -e "  • Database backup: $([ -n "$db_backup" ] && basename "$db_backup" || "Skipped")"
    echo -e "  • Local backups: $(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)/${MAX_LOCAL_BACKUPS}"
    echo -e "  • Remote storage: $([ -n "$CLOUDFLARE_R2_BUCKET" ] && echo "Enabled" || echo "Disabled")"
    echo ""
}

# Error handling
trap 'print_error "Backup failed with error on line $LINENO"; send_notification "error" "Backup failed with error"; exit 1' ERR

# Run main function with all arguments
main "$@"