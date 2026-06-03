#!/bin/bash
# Deploy mirato di un singolo file backend.
# Uso: ./scripts/deploy-backend-file.sh routes/cms-routes.js [--yes] [--dry-run] [--restart|--no-restart]

set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"
source "$BASE_DIR/scripts/deploy-config.sh"

if [ $# -lt 1 ]; then
    echo "Uso: $0 <percorso-relativo-da-backend> [--yes] [--dry-run] [--restart|--no-restart]"
    exit 1
fi

FILE_PATH="$1"
shift
deploy_parse_common_flags "$@"

LOCAL_FILE="backend/$FILE_PATH"
if [ ! -f "$LOCAL_FILE" ]; then
    echo "File non trovato: $LOCAL_FILE"
    exit 1
fi

SERVICE="$DEPLOY_PM2_SERVICE"
if [[ "$FILE_PATH" == *document* ]] || [[ "$FILE_PATH" == *pdf* ]]; then
    SERVICE="${DEPLOY_DOCUMENTS_PM2_SERVICE:-documents-server}"
fi

echo "Deploy file backend"
echo "File:   $FILE_PATH"
echo "Target: $DEPLOY_SERVER:$DEPLOY_BACKEND_PATH/$FILE_PATH"
echo "Mode:   $([ "$DEPLOY_DRY_RUN" = "true" ] && echo dry-run || echo apply)"

deploy_rsync_backend "$LOCAL_FILE" "$DEPLOY_BACKEND_PATH/$FILE_PATH"

if [[ "$FILE_PATH" == routes/* || "$FILE_PATH" == controllers/* || "$FILE_PATH" == services/* || "$FILE_PATH" == middleware/* || "$FILE_PATH" == config/* ]]; then
    deploy_maybe_restart "$SERVICE"
fi

echo "Deploy completato"
