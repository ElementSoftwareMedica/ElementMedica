#!/bin/bash
# Shared deploy configuration for local scripts.
# Override values with environment variables instead of editing scripts.

DEPLOY_SERVER_IP="${DEPLOY_SERVER_IP:-178.104.197.134}"
DEPLOY_SERVER_USER="${DEPLOY_SERVER_USER:-elementmedica}"
DEPLOY_SERVER="${DEPLOY_SERVER_USER}@${DEPLOY_SERVER_IP}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
DEPLOY_BASE_PATH="${DEPLOY_BASE_PATH:-/var/www/elementmedica}"
DEPLOY_BACKEND_PATH="${DEPLOY_BACKEND_PATH:-$DEPLOY_BASE_PATH/backend}"
DEPLOY_DIST_PATH="${DEPLOY_DIST_PATH:-$DEPLOY_BASE_PATH/dist}"
DEPLOY_PUBLIC_PATH="${DEPLOY_PUBLIC_PATH:-$DEPLOY_BASE_PATH/dist-public}"
DEPLOY_PM2_SERVICE="${DEPLOY_PM2_SERVICE:-api-server}"

DEPLOY_YES="${DEPLOY_YES:-false}"
DEPLOY_DRY_RUN="${DEPLOY_DRY_RUN:-false}"
DEPLOY_RESTART="${DEPLOY_RESTART:-prompt}"

deploy_parse_common_flags() {
    while [ $# -gt 0 ]; do
        case "$1" in
            -y|--yes)
                DEPLOY_YES="true"
                ;;
            --dry-run)
                DEPLOY_DRY_RUN="true"
                ;;
            --restart)
                DEPLOY_RESTART="true"
                ;;
            --no-restart)
                DEPLOY_RESTART="false"
                ;;
        esac
        shift
    done
}

deploy_confirm() {
    local prompt="${1:-Procedere?}"
    if [ "$DEPLOY_YES" = "true" ] || [ "${CI:-false}" = "true" ]; then
        return 0
    fi
    read -r -p "$prompt (y/N): " answer
    [[ "$answer" =~ ^[Yy]$ ]]
}

deploy_ssh() {
    ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_SERVER" "$@"
}

deploy_rsync_backend() {
    local src="$1"
    local dest="$2"
    shift 2
    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        rsync -avz --dry-run \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '.env' \
            --exclude 'logs/*' \
            --exclude '*.log' \
            --exclude 'uploads/' \
            --exclude '.DS_Store' \
            -e "ssh -i $DEPLOY_SSH_KEY" \
            "$src" "$DEPLOY_SERVER:$dest" "$@"
        return
    fi
    rsync -avz \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '.env' \
        --exclude 'logs/*' \
        --exclude '*.log' \
        --exclude 'uploads/' \
        --exclude '.DS_Store' \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        "$src" "$DEPLOY_SERVER:$dest" "$@"
}

deploy_rsync_frontend() {
    local src="$1"
    local dest="$2"
    if [ "$DEPLOY_DRY_RUN" = "true" ]; then
        rsync -avz --delete --dry-run \
            --no-perms \
            --exclude '.DS_Store' \
            --exclude '*.map' \
            -e "ssh -i $DEPLOY_SSH_KEY" \
            "$src" "$DEPLOY_SERVER:$dest"
        return
    fi
    rsync -avz --delete \
        --no-perms \
        --exclude '.DS_Store' \
        --exclude '*.map' \
        -e "ssh -i $DEPLOY_SSH_KEY" \
        "$src" "$DEPLOY_SERVER:$dest"
}

deploy_maybe_restart() {
    local service="${1:-$DEPLOY_PM2_SERVICE}"
    case "$DEPLOY_RESTART" in
        true)
            deploy_ssh "pm2 restart $service && pm2 status $service"
            ;;
        false)
            echo "Restart saltato. Servizio da riavviare: $service"
            ;;
        *)
            if deploy_confirm "Riavviare $service ora?"; then
                deploy_ssh "pm2 restart $service && pm2 status $service"
            else
                echo "Restart saltato. Servizio da riavviare: $service"
            fi
            ;;
    esac
}
