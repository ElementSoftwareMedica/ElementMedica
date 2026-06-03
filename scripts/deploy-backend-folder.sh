#!/bin/bash
# Deploy mirato di una cartella backend.
# Uso: ./scripts/deploy-backend-folder.sh routes [--yes] [--dry-run] [--restart|--no-restart]

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"
source "$BASE_DIR/scripts/deploy-config.sh"

if [ $# -lt 1 ]; then
    echo "Uso: $0 <cartella-backend> [--yes] [--dry-run] [--restart|--no-restart]"
    exit 1
fi

FOLDER="$1"
shift
deploy_parse_common_flags "$@"

LOCAL_FOLDER="backend/$FOLDER"
if [ ! -d "$LOCAL_FOLDER" ]; then
    echo "Cartella non trovata: $LOCAL_FOLDER"
    exit 1
fi

echo "Deploy cartella backend"
echo "Folder: $FOLDER/"
echo "Target: $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/$FOLDER/"
echo "Mode:   $([ "$DEPLOY_DRY_RUN" = "true" ] && echo dry-run || echo apply)"

if [ "$DEPLOY_DRY_RUN" != "true" ] && ! deploy_confirm "Sincronizzare la cartella backend?"; then
    echo "Deploy annullato"
    exit 0
fi

deploy_rsync_backend "$LOCAL_FOLDER/" "$DEPLOY_BACKEND_PATH/$FOLDER/"
deploy_maybe_restart "$DEPLOY_PM2_SERVICE"

echo "Deploy completato"
