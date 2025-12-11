#!/bin/bash

# =============================================================================
# Build Script per PRODUCTION - ElementMedica Multi-Domain
# =============================================================================
# Genera due build separate:
# - dist/           → elementformazione.com (CRM)
# - dist-public/    → elementmedica.com (Frontend Pubblico)
# =============================================================================

set -e  # Exit on error

echo "============================================="
echo "🚀 ElementMedica Production Build"
echo "============================================="
echo ""

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo "📁 Working directory: $BASE_DIR"
echo ""

# Pulizia build precedenti
echo "🧹 Cleaning previous builds..."
rm -rf dist dist-public
mkdir -p dist dist-public

# =============================================================================
# BUILD 1: Element Formazione (CRM) → elementformazione.com
# =============================================================================
echo ""
echo -e "${YELLOW}=============================================${NC}"
echo -e "${YELLOW}📦 BUILD 1: Element Formazione (CRM)${NC}"
echo -e "${YELLOW}   Domain: elementformazione.com${NC}"
echo -e "${YELLOW}   Output: dist/${NC}"
echo -e "${YELLOW}=============================================${NC}"
echo ""

# Copia env di produzione
cp .env.production.formazione .env

# Build con Vite
echo "🔧 Running npm build for element-formazione..."
npm run build

# Verifica output
if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✅ Element Formazione build completato!${NC}"
    echo "   Files: $(find dist -type f | wc -l | tr -d ' ')"
    echo "   Size: $(du -sh dist | cut -f1)"
else
    echo -e "${RED}❌ Build Element Formazione FALLITO!${NC}"
    exit 1
fi

# =============================================================================
# BUILD 2: Element Medica (Pubblico) → elementmedica.com
# =============================================================================
echo ""
echo -e "${YELLOW}=============================================${NC}"
echo -e "${YELLOW}📦 BUILD 2: Element Medica (Pubblico)${NC}"
echo -e "${YELLOW}   Domain: elementmedica.com${NC}"
echo -e "${YELLOW}   Output: dist-public/${NC}"
echo -e "${YELLOW}=============================================${NC}"
echo ""

# Copia env di produzione medica
cp .env.production.medica .env

# Build con output directory personalizzata
echo "🔧 Running npm build for element-medica..."
npm run build -- --outDir dist-public

# Verifica output
if [ -f "dist-public/index.html" ]; then
    echo -e "${GREEN}✅ Element Medica build completato!${NC}"
    echo "   Files: $(find dist-public -type f | wc -l | tr -d ' ')"
    echo "   Size: $(du -sh dist-public | cut -f1)"
else
    echo -e "${RED}❌ Build Element Medica FALLITO!${NC}"
    exit 1
fi

# Ripristina env originale
cp .env.production.formazione .env

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ BUILD COMPLETATO CON SUCCESSO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "📦 Output directories:"
echo "   • dist/         → elementformazione.com (CRM)"
echo "   • dist-public/  → elementmedica.com (Pubblico)"
echo ""
echo "📊 Build sizes:"
du -sh dist dist-public 2>/dev/null || true
echo ""
echo "🚀 Prossimi passi:"
echo "   1. Upload su server: scp -r dist dist-public elementmedica@128.140.15.15:/var/www/elementmedica/"
echo "   2. Oppure usa lo script: ./scripts/deploy-production.sh"
echo ""
