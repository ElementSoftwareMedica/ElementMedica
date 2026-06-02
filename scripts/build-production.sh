#!/bin/bash

# =============================================================================
# Build Script per PRODUCTION - ElementMedica Multi-Domain
# =============================================================================
# Genera due build separate:
# - dist/           → elementsicurezza.com (CRM)
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

# Backup .env originale per ripristinarlo dopo il build
if [ -f ".env" ]; then
    cp .env .env.build-backup
    echo "💾 Backup .env originale → .env.build-backup"
fi

# Pulizia build precedenti
echo "🧹 Cleaning previous builds..."
rm -rf dist dist-public
mkdir -p dist dist-public

# =============================================================================
# BUILD 1: Element Sicurezza (CRM) → elementsicurezza.com
# =============================================================================
echo ""
echo -e "${YELLOW}=============================================${NC}"
echo -e "${YELLOW}📦 BUILD 1: Element Sicurezza (CRM)${NC}"
echo -e "${YELLOW}   Domain: elementsicurezza.com${NC}"
echo -e "${YELLOW}   Output: dist/${NC}"
echo -e "${YELLOW}=============================================${NC}"
echo ""

# Copia env di produzione
cp .env.production.sicurezza .env

# Build con Vite
echo "🔧 Running npm build for element-sicurezza..."
npm run build

# Verifica output
if [ -f "dist/index.html" ]; then
    # Copy brand-specific SEO files (handled by npm build for everything else)
    cp "$BASE_DIR/public/robots-sicurezza.txt" dist/robots.txt
    cp "$BASE_DIR/public/sitemap-sicurezza.xml" dist/sitemap.xml
    echo -e "${GREEN}✅ Element Sicurezza build completato!${NC}"
    echo "   Files: $(find dist -type f | wc -l | tr -d ' ')"
    echo "   Size: $(du -sh dist | cut -f1)"
else
    echo -e "${RED}❌ Build Element Sicurezza FALLITO!${NC}"
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

# Copia env di produzione medica (sia come .env che .env.production per assicurare la precedenza Vite)
cp .env.production.medica .env
cp .env.production.medica .env.production

# Build con output directory personalizzata
echo "🔧 Running npm build for element-medica..."
npm run build -- --outDir dist-public

# Verifica output
if [ -f "dist-public/index.html" ]; then
    # Copy brand-specific SEO files (handled by npm build for everything else)
    cp "$BASE_DIR/public/robots-medica.txt" dist-public/robots.txt
    cp "$BASE_DIR/public/sitemap-medica.xml" dist-public/sitemap.xml
    echo -e "${GREEN}✅ Element Medica build completato!${NC}"
    echo "   Files: $(find dist-public -type f | wc -l | tr -d ' ')"
    echo "   Size: $(du -sh dist-public | cut -f1)"
else
    echo -e "${RED}❌ Build Element Medica FALLITO!${NC}"
    exit 1
fi

# Ripristina env originale
if [ -f ".env.build-backup" ]; then
    mv .env.build-backup .env
    echo "♻️  Ripristinato .env originale"
else
    cp .env.production.sicurezza .env
fi
# Ripristina .env.production a sicurezza (default)
cp .env.production.sicurezza .env.production
echo "♻️  Ripristinato .env.production a element-sicurezza (default)"

# =============================================================================
# POST-BUILD: Pre-comprimi gli asset statici per gzip_static di nginx
# =============================================================================
echo ""
echo "🗜️  Pre-compressione asset statici (gzip level 9)..."
node scripts/compress-assets.mjs
echo "✅ Pre-compressione completata"

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}✅ BUILD COMPLETATO CON SUCCESSO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "📦 Output directories:"
echo "   • dist/         → elementsicurezza.com (CRM)"
echo "   • dist-public/  → elementmedica.com (Pubblico)"
echo ""
echo "📊 Build sizes:"
du -sh dist dist-public 2>/dev/null || true
echo ""
echo "🚀 Prossimi passi:"
echo "   1. Upload su server: scp -r dist dist-public elementmedica@178.104.44.177:/var/www/elementmedica/"
echo "   2. Oppure usa lo script: ./scripts/deploy-production.sh"
echo ""
