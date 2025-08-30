#!/bin/bash

# 🧹 SCRIPT AUTOMATICO RIORDINO PROGETTO
# Versione: 1.0
# Data: $(date)

set -e  # Exit on error

PROJECT_ROOT="/Users/matteo.michielon/project 2.0"
BACKUP_DIR="$PROJECT_ROOT/backup_riordino_$(date +%Y%m%d_%H%M%S)"

echo "🚀 AVVIO RIORDINO PROGETTO"
echo "📁 Directory progetto: $PROJECT_ROOT"
echo "💾 Backup in: $BACKUP_DIR"

# Crea directory di backup
mkdir -p "$BACKUP_DIR"

# FASE 1: BACKUP FILE CRITICI
echo ""
echo "📦 FASE 1: BACKUP FILE CRITICI"
cp "$PROJECT_ROOT/package.json" "$BACKUP_DIR/"
cp "$PROJECT_ROOT/.env"* "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$PROJECT_ROOT/.trae" "$BACKUP_DIR/" 2>/dev/null || true

# FASE 2: CREAZIONE DIRECTORY MANCANTI
echo ""
echo "📁 FASE 2: CREAZIONE DIRECTORY"
mkdir -p "$PROJECT_ROOT/backend/scripts"
mkdir -p "$PROJECT_ROOT/backend/config"
mkdir -p "$PROJECT_ROOT/backend/middleware"
mkdir -p "$PROJECT_ROOT/docs/troubleshooting"

# FASE 3: SPOSTAMENTO FILE SQL
echo ""
echo "🗄️ FASE 3: SPOSTAMENTO FILE SQL"
mv "$PROJECT_ROOT/add-missing-permissions.sql" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true
mv "$PROJECT_ROOT/fix-persons-enum.sql" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true

# FASE 4: SPOSTAMENTO SCRIPT UTILITY
echo ""
echo "🔧 FASE 4: SPOSTAMENTO SCRIPT UTILITY"
mv "$PROJECT_ROOT/add-test-users.cjs" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true
mv "$PROJECT_ROOT/find-users.cjs" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true
mv "$PROJECT_ROOT/get-tenant-id.cjs" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true
mv "$PROJECT_ROOT/setup-test-data.cjs" "$PROJECT_ROOT/backend/scripts/" 2>/dev/null || true

# FASE 5: SPOSTAMENTO DOCUMENTAZIONE
echo ""
echo "📚 FASE 5: SPOSTAMENTO DOCUMENTAZIONE"
mv "$PROJECT_ROOT/ADMIN_PERMISSIONS_FIX.md" "$PROJECT_ROOT/docs/troubleshooting/" 2>/dev/null || true
mv "$PROJECT_ROOT/ROLE_FIXES_SUMMARY.md" "$PROJECT_ROOT/docs/troubleshooting/" 2>/dev/null || true

# FASE 6: SPOSTAMENTO MIDDLEWARE
echo ""
echo "⚙️ FASE 6: SPOSTAMENTO MIDDLEWARE"
if [ -d "$PROJECT_ROOT/middleware" ]; then
    mv "$PROJECT_ROOT/middleware"/* "$PROJECT_ROOT/backend/middleware/" 2>/dev/null || true
    rmdir "$PROJECT_ROOT/middleware" 2>/dev/null || true
fi

# FASE 7: SPOSTAMENTO CONFIG
echo ""
echo "🔧 FASE 7: SPOSTAMENTO CONFIG"
if [ -d "$PROJECT_ROOT/config" ]; then
    mv "$PROJECT_ROOT/config"/* "$PROJECT_ROOT/backend/config/" 2>/dev/null || true
    rmdir "$PROJECT_ROOT/config" 2>/dev/null || true
fi

# FASE 8: ELIMINAZIONE FILE DEBUG
echo ""
echo "🗑️ FASE 8: ELIMINAZIONE FILE DEBUG"

# Lista file debug da eliminare
DEBUG_FILES=(
    "debug-auth-token.cjs"
    "debug-auth-token.js"
    "debug-company-creation.cjs"
    "debug-current-auth.cjs"
    "debug-current-auth.js"
    "debug-hierarchy-direct.cjs"
    "debug-middleware-test.cjs"
    "debug-permission-generation.js"
    "debug-permissions-browser.js"
    "debug-permissions-mapping.js"
    "debug-permissions-structure.cjs"
    "debug-permissions.cjs"
    "debug-permissions.js"
    "debug-rbac-direct.mjs"
    "debug-rbac-service.cjs"
    "debug_permissions.cjs"
    "debug_permissions.js"
)

for file in "${DEBUG_FILES[@]}"; do
    rm -f "$PROJECT_ROOT/$file"
done

# FASE 9: ELIMINAZIONE FILE TEST
echo ""
echo "🧪 FASE 9: ELIMINAZIONE FILE TEST"

# Elimina tutti i file test-* eccetto test-simple-login-verify.cjs
find "$PROJECT_ROOT" -maxdepth 1 -name "test-*.cjs" -not -name "test-simple-login-verify.cjs" -delete 2>/dev/null || true
find "$PROJECT_ROOT" -maxdepth 1 -name "test-*.js" -delete 2>/dev/null || true

# FASE 10: ELIMINAZIONE FILE CHECK
echo ""
echo "✅ FASE 10: ELIMINAZIONE FILE CHECK"
rm -f "$PROJECT_ROOT"/check-*.cjs
rm -f "$PROJECT_ROOT"/check-*.js

# FASE 11: ELIMINAZIONE FILE TEMPORANEI
echo ""
echo "🧹 FASE 11: ELIMINAZIONE FILE TEMPORANEI"
rm -f "$PROJECT_ROOT/cookies.txt"
rm -f "$PROJECT_ROOT/verify-fixes.cjs"
rm -f "$PROJECT_ROOT/test_login.json"
rm -f "$PROJECT_ROOT/PLANNING_DETTAGLIATO.md"

# FASE 12: ELIMINAZIONE CARTELLE VUOTE
echo ""
echo "📂 FASE 12: ELIMINAZIONE CARTELLE VUOTE"
rmdir "$PROJECT_ROOT/frontend/src/components" 2>/dev/null || true
rmdir "$PROJECT_ROOT/frontend/src" 2>/dev/null || true
rmdir "$PROJECT_ROOT/frontend" 2>/dev/null || true
rmdir "$PROJECT_ROOT/shared" 2>/dev/null || true

# FASE 13: VERIFICA FINALE
echo ""
echo "🔍 FASE 13: VERIFICA FINALE"
echo "📊 File rimanenti nella root:"
ls -la "$PROJECT_ROOT" | grep -v "^d" | wc -l

echo ""
echo "✅ RIORDINO COMPLETATO!"
echo "💾 Backup salvato in: $BACKUP_DIR"
echo "📁 Verifica la struttura con: ls -la '$PROJECT_ROOT'"

# Test rapido funzionalità
echo ""
echo "🧪 TEST RAPIDO FUNZIONALITÀ"
if [ -f "$PROJECT_ROOT/package.json" ]; then
    echo "✅ package.json presente"
else
    echo "❌ package.json mancante!"
fi

if [ -d "$PROJECT_ROOT/backend" ]; then
    echo "✅ Directory backend presente"
else
    echo "❌ Directory backend mancante!"
fi

if [ -d "$PROJECT_ROOT/src" ]; then
    echo "✅ Directory src presente"
else
    echo "❌ Directory src mancante!"
fi

echo ""
echo "🎉 RIORDINO PROGETTO COMPLETATO CON SUCCESSO!"