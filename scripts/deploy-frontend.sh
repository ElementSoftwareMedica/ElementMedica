#!/bin/bash
# Deploy frontend incrementale via rsync.
# Uso:
#   ./scripts/deploy-frontend.sh [--yes] [--dry-run]
#   ./scripts/deploy-frontend.sh --public [--yes] [--dry-run]
#   ./scripts/deploy-frontend.sh --all [--yes] [--dry-run]

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"
source "$BASE_DIR/scripts/deploy-config.sh"

TARGETS=("crm")
ARGS=()
while [ $# -gt 0 ]; do
    case "$1" in
        --public)
            TARGETS=("public")
            ;;
        --all)
            TARGETS=("crm" "public")
            ;;
        *)
            ARGS+=("$1")
            ;;
    esac
    shift
done
deploy_parse_common_flags "${ARGS[@]}"

build_if_missing() {
    local dir="$1"
    if [ ! -d "$dir" ] || [ ! -f "$dir/index.html" ]; then
        echo "$dir non trovato. Eseguo build produzione."
        ./scripts/build-production.sh
    fi
}

deploy_target() {
    local name="$1"
    local src dest
    if [ "$name" = "public" ]; then
        src="dist-public/"
        dest="$DEPLOY_PUBLIC_PATH/"
    else
        src="dist/"
        dest="$DEPLOY_DIST_PATH/"
    fi
    build_if_missing "${src%/}"
    echo "Deploy frontend $name"
    echo "Target: $DEPLOY_SERVER:$dest"
    echo "Mode:   $([ "$DEPLOY_DRY_RUN" = "true" ] && echo dry-run || echo apply)"
    if [ "$DEPLOY_DRY_RUN" != "true" ] && ! deploy_confirm "Sincronizzare $src?"; then
        echo "Deploy $name annullato"
        return
    fi
    deploy_rsync_frontend "$src" "$dest"
    if [ "$DEPLOY_DRY_RUN" != "true" ]; then
        deploy_ssh "find $dest -type f -exec chmod 644 {} + && find $dest -type d -exec chmod 755 {} +"
    fi
}

for target in "${TARGETS[@]}"; do
    deploy_target "$target"
done

echo "Deploy frontend completato"
