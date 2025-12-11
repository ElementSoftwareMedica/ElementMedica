#!/bin/bash
# Navigate to the backend directory which has Prisma client
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"

cd "$BACKEND_DIR" || exit 1

echo "🔄 Aggiornamento pagine Element Medica..."
echo "Working directory: $(pwd)"

node "$SCRIPT_DIR/01-homepage-medica.cjs"
node "$SCRIPT_DIR/02-medicina-lavoro-medica.cjs"
node "$SCRIPT_DIR/03-visite-specialistiche-medica.cjs"
node "$SCRIPT_DIR/04-diagnostica-medica.cjs"
node "$SCRIPT_DIR/05-contatti-medica.cjs"
node "$SCRIPT_DIR/06-prenota-medica.cjs"

echo "✅ Completato!"
