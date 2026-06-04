#!/bin/bash
# scripts/deploy-desktop-updates.sh
# =============================================================================
# Deploy Desktop App Update Files - ElementMedica
# =============================================================================
# Upload release artifacts to the update server so electron-updater can
# serve them to users with an installed copy of the app.
#
# Update server URL: https://www.elementmedica.com/desktop-updates
# Configured in: desktop-app/electron-builder.yml (publish.url)
#
# Files served (per electron-updater generic provider):
#   latest-mac.yml        — update manifest (required by electron-updater)
#   latest.yml            — update manifest for Windows
#   latest-linux.yml      — update manifest for Linux
#   *.dmg / *.zip         — macOS binaries
#   *-Setup.exe           — Windows installer
#   *.AppImage            — Linux binary
#   *.blockmap            — block-level diff for efficient delta updates
#
# Prerequisites:
#   - SSH key access to the server
#   - rsync installed locally
#   - releases built: cd desktop-app && npm run package
#
# Usage:
#   ./scripts/deploy-desktop-updates.sh          # deploy latest release
#   ./scripts/deploy-desktop-updates.sh --mac    # only macOS files
#   ./scripts/deploy-desktop-updates.sh --win    # only Windows files
#   ./scripts/deploy-desktop-updates.sh --check  # verify what would be uploaded (dry-run)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$BASE_DIR/scripts/deploy-config.sh"

REMOTE_UPDATES_PATH="${DEPLOY_DESKTOP_UPDATES_PATH:-$DEPLOY_BASE_PATH/desktop-updates}"
RELEASE_DIR="$(cd "$BASE_DIR/desktop-app/release" && pwd)"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }
log_deploy()  { echo -e "${PURPLE}🚀 $1${NC}"; }

# ---------------------------------------------------------------------------
# Parse options
# ---------------------------------------------------------------------------
PLATFORM="all"
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --mac)   PLATFORM="mac"  ;;
        --win)   PLATFORM="win"  ;;
        --linux) PLATFORM="linux" ;;
        --check|--dry-run) DRY_RUN=true ;;
        -y|--yes) DEPLOY_YES=true ;;
        --help)
            echo "Usage: $0 [--mac|--win|--linux|--check]"
            exit 0
            ;;
    esac
done

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}🖥  ElementMedica Desktop — Update Deploy${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo "📡 Server:  $DEPLOY_SERVER"
echo "📁 Source:  $RELEASE_DIR"
echo "📁 Remote:  $REMOTE_UPDATES_PATH"
echo "🌐 URL:     https://www.elementmedica.com/desktop-updates"
echo ""

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
log_info "Running pre-flight checks..."

if [ ! -d "$RELEASE_DIR" ]; then
    log_error "Release directory not found: $RELEASE_DIR"
    log_error "Run first: cd desktop-app && npm run package"
    exit 1
fi

if [ ! -f "$RELEASE_DIR/latest-mac.yml" ] && [ "$PLATFORM" != "win" ] && [ "$PLATFORM" != "linux" ]; then
    log_error "latest-mac.yml not found. Run: cd desktop-app && npm run package"
    exit 1
fi

log_success "Release directory found"

# List files to be uploaded
echo ""
log_info "Files in release directory:"
ls -lh "$RELEASE_DIR" | grep -E "\.(dmg|zip|exe|AppImage|yml|yaml|blockmap)$" | while read -r line; do
    echo "   $line"
done
echo ""

# ---------------------------------------------------------------------------
# Ensure remote directory exists
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" = false ]; then
    log_info "Ensuring remote directory exists..."
    deploy_ssh "mkdir -p $REMOTE_UPDATES_PATH && chmod 755 $REMOTE_UPDATES_PATH"
    log_success "Remote directory ready"
fi

# ---------------------------------------------------------------------------
# Build rsync include/exclude patterns based on platform
# ---------------------------------------------------------------------------
case $PLATFORM in
    mac)
        INCLUDE_PATTERN="--include=*.dmg --include=*.dmg.blockmap --include=*.zip --include=*.zip.blockmap --include=latest-mac.yml"
        ;;
    win)
        INCLUDE_PATTERN="--include=*-Setup.exe --include=*-Setup.exe.blockmap --include=latest.yml"
        ;;
    linux)
        INCLUDE_PATTERN="--include=*.AppImage --include=*.AppImage.blockmap --include=latest-linux.yml"
        ;;
    all)
        INCLUDE_PATTERN="--include=*.dmg --include=*.dmg.blockmap --include=*.zip --include=*.zip.blockmap --include=*-Setup.exe --include=*-Setup.exe.blockmap --include=*.AppImage --include=*.AppImage.blockmap --include=latest-mac.yml --include=latest.yml --include=latest-linux.yml"
        ;;
esac

# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
RSYNC_OPTS="-avz --progress"
if [ "$DRY_RUN" = true ]; then
    RSYNC_OPTS="$RSYNC_OPTS --dry-run"
    log_warning "DRY RUN — no files will be uploaded"
fi

log_deploy "Uploading update files (platform: $PLATFORM)..."

# Build array of files to sync based on platform
FILES_TO_SYNC=()
case $PLATFORM in
    mac|all)
        for f in "$RELEASE_DIR"/*.dmg "$RELEASE_DIR"/*.dmg.blockmap "$RELEASE_DIR"/*.zip "$RELEASE_DIR"/*.zip.blockmap "$RELEASE_DIR/latest-mac.yml"; do
            [[ -f "$f" ]] && FILES_TO_SYNC+=("$f")
        done
        ;;
esac
case $PLATFORM in
    win|all)
        for f in "$RELEASE_DIR"/*-Setup.exe "$RELEASE_DIR"/*-Setup.exe.blockmap "$RELEASE_DIR/latest.yml"; do
            [[ -f "$f" ]] && FILES_TO_SYNC+=("$f")
        done
        ;;
esac
case $PLATFORM in
    linux|all)
        for f in "$RELEASE_DIR"/*.AppImage "$RELEASE_DIR"/*.AppImage.blockmap "$RELEASE_DIR/latest-linux.yml"; do
            [[ -f "$f" ]] && FILES_TO_SYNC+=("$f")
        done
        ;;
esac

rsync $RSYNC_OPTS \
    -e "ssh -i $DEPLOY_SSH_KEY -o StrictHostKeyChecking=no" \
    "${FILES_TO_SYNC[@]}" \
    "$DEPLOY_SERVER:$REMOTE_UPDATES_PATH/"

if [ "$DRY_RUN" = true ]; then
    log_warning "Dry run complete. Run without --check to upload for real."
    exit 0
fi

# ---------------------------------------------------------------------------
# Verify remote files
# ---------------------------------------------------------------------------
log_info "Verifying remote files..."
deploy_ssh "ls -lh $REMOTE_UPDATES_PATH/ 2>/dev/null | tail -20"

# ---------------------------------------------------------------------------
# Set correct permissions
# ---------------------------------------------------------------------------
log_info "Setting file permissions..."
deploy_ssh "find $REMOTE_UPDATES_PATH -type f -exec chmod 644 {} \; && find $REMOTE_UPDATES_PATH -type d -exec chmod 755 {} \;"

log_success "File permissions set"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
log_success "Desktop update files deployed!"
echo ""
echo "🌐 Verify update manifest:"
echo "   curl https://www.elementmedica.com/desktop-updates/latest-mac.yml"
echo ""
echo "🔔 IMPORTANT: Nginx must serve this directory."
echo "   Add the block from nginx/updates-elementmedica.conf"
echo "   then: sudo nginx -t && sudo systemctl reload nginx"
echo ""
