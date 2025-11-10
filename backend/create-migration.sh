#!/bin/bash
# Script per creare migration Prisma

set -e

echo "🔧 Creazione migration preventivi e codici sconto..."
echo ""

# Naviga alla directory backend
cd "$(dirname "$0")"

# Verifica che lo schema sia valido
echo "✓ Validazione schema..."
npx prisma validate

echo ""
echo "⚠️  La migration richiede conferma interattiva."
echo "Quando richiesto, premere 'y' e poi ENTER."
echo ""

# Crea la migration
npx prisma migrate dev --name add_preventivi_codici_sconto_system --create-only

echo ""
echo "✅ Migration creata con successo!"
echo "📁 Percorso: backend/prisma/migrations/"
