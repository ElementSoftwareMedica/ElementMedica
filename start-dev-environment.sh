#!/bin/bash

# Script di avvio completo dell'ambiente di sviluppo
# P64: Proxy server eliminato - solo API + Documents + Frontend
# Gestisce backend (API + Docs) e frontend (Vite)

set -e

PROJECT_ROOT="/Users/matteo.michielon/project 2.0 VS"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOGS_DIR="$PROJECT_ROOT/logs"

echo "🔧 Avvio ambiente di sviluppo Element Medica"
echo "============================================="
echo "P64: Architettura semplificata (Proxy eliminato)"
echo ""

# 1. Pulizia processi esistenti
echo "1️⃣  Pulizia processi esistenti..."
lsof -ti:4001 | xargs kill -9 2>/dev/null || true
lsof -ti:4002 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2
echo "   ✅ Porte liberate"
echo ""

# 2. Creazione directory log
echo "2️⃣  Preparazione directory log..."
mkdir -p "$LOGS_DIR/api-server"
mkdir -p "$LOGS_DIR/documents-server"
echo "   ✅ Directory pronte"
echo ""

# 3. Avvio backend
echo "3️⃣  Avvio backend services..."
cd "$BACKEND_DIR"

echo "   - API Server (4001)..."
node servers/api-server.js > "$LOGS_DIR/api-server/api.log" 2>&1 &
API_PID=$!
sleep 2

echo "   - Documents Server (4002)..."
node servers/documents-server.js > "$LOGS_DIR/documents-server/docs.log" 2>&1 &
DOCS_PID=$!
sleep 2

echo "   ✅ Backend services avviati"
echo ""

# 4. Verifica health backend
echo "4️⃣  Verifica health backend..."
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
  echo "   ✅ API Server: healthy"
else
  echo "   ❌ API Server: NON risponde"
  exit 1
fi
echo ""

# 5. Avvio frontend
echo "5️⃣  Avvio frontend (Vite)..."
cd "$PROJECT_ROOT"
npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
VITE_PID=$!
sleep 5
echo "   ✅ Frontend avviato (PID: $VITE_PID)"
echo ""

# 6. Verifica completa
echo "6️⃣  Verifica completa sistema..."
echo ""
echo "   🌐 Backend Services:"
echo "      - API Server:   http://localhost:4001 (PID: $API_PID)"
echo "      - Docs Server:  http://localhost:4002 (PID: $DOCS_PID)"
echo ""
echo "   🖥  Frontend:"
echo "      - Vite Dev:     http://localhost:5173 (PID: $VITE_PID)"
echo "      - Vite proxy:   /api -> http://localhost:4001"
echo ""
echo "   📋 Logs:"
echo "      - API:      $LOGS_DIR/api-server/api.log"
echo "      - Docs:     $LOGS_DIR/documents-server/docs.log"
echo "      - Frontend: $LOGS_DIR/frontend.log"
echo ""
echo "✅ Sistema avviato correttamente!"
echo ""
echo "💡 Per fermare tutto: lsof -ti:4001,4002,5173 | xargs kill -9"
echo ""

# Salva i PID per riferimento
echo "$API_PID" > "$LOGS_DIR/api.pid"
echo "$DOCS_PID" > "$LOGS_DIR/docs.pid"
echo "$VITE_PID" > "$LOGS_DIR/vite.pid"

# Test finale proxy Vite
echo "🧪 Test proxy Vite..."
sleep 3
if curl -s http://localhost:5173/api/health 2>&1 | grep -q "ok\|healthy"; then
  echo "   ✅ Proxy Vite funzionante"
else
  echo "   ⚠️  Proxy Vite potrebbe avere problemi - verifica i log"
fi
echo ""
