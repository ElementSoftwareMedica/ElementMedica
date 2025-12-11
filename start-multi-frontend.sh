#!/bin/bash

# Script per avviare entrambi i frontend Element
# Element Formazione (5173) + Element Medica (5174)

echo "🚀 Avvio Sistema Multi-Frontend Element"
echo "========================================"
echo ""

# Verifica backend attivo
if ! lsof -ti:4001,4003 > /dev/null; then
  echo "⚠️  Backend non attivo! Avvio backend..."
  cd backend && npm start > /tmp/backend.log 2>&1 &
  BACKEND_PID=$!
  echo "📡 Backend avviato (PID: $BACKEND_PID)"
  sleep 3
else
  echo "✅ Backend già attivo"
fi

echo ""
echo "🔵 Avvio Element Formazione (localhost:5173)"
echo "   - Brand: element-formazione"
echo "   - Features: Corsi, Medicina, RSPP"
echo ""

echo "🟢 Avvio Element Medica (localhost:5174)"
echo "   - Brand: element-medica"
echo "   - Features: Medicina, Poliambulatorio"
echo ""

# Avvia entrambi i frontend con concurrently
npm run dev:both

echo ""
echo "👋 Shutdown in corso..."
