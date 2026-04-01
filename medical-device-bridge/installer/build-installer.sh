#!/bin/bash
# ============================================================================
# ElementMedica - Build distribuzione Medical Device Bridge per Windows
# ============================================================================
# Questo script compila il Bridge, crea l'eseguibile standalone e impacchetta
# tutto in un file ZIP pronto per il download dalla webapp.
#
# Uso: ./build-installer.sh
# Output: dist/ElementMedica-Bridge-Setup.zip
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BRIDGE_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$BRIDGE_DIR/dist"
INSTALLER_DIR="$BRIDGE_DIR/installer"
PACKAGE_DIR="$DIST_DIR/package"
OUTPUT_ZIP="$DIST_DIR/ElementMedica-Bridge-Setup.zip"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ElementMedica - Build Medical Device Bridge Installer      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Build TypeScript
echo "[1/4] Compilazione TypeScript..."
cd "$BRIDGE_DIR"
npx tsc
echo "      ✓ Build completata"

# Step 2: Create standalone executable for Windows
echo "[2/4] Creazione eseguibile standalone Windows..."
if command -v pkg &> /dev/null || npx pkg --version &> /dev/null 2>&1; then
    npx pkg package.json \
        --targets node18-win-x64 \
        --output "$DIST_DIR/medical-bridge-win.exe" \
        --compress GZip || {
            echo "      [AVVISO] pkg non disponibile — l'eseguibile dovrà essere creato separatamente"
            echo "      Il pacchetto ZIP includerà solo gli script di installazione"
        }
else
    echo "      [AVVISO] pkg non installato — eseguire: npm install -g pkg"
    echo "      Il pacchetto ZIP includerà solo gli script di installazione"
fi

# Step 3: Assemble package directory
echo "[3/4] Assemblaggio pacchetto..."
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy installer files
cp "$INSTALLER_DIR/install.bat" "$PACKAGE_DIR/"
cp "$INSTALLER_DIR/GUIDA-INSTALLAZIONE.txt" "$PACKAGE_DIR/"

# Copy executable if available
if [ -f "$DIST_DIR/medical-bridge-win.exe" ]; then
    cp "$DIST_DIR/medical-bridge-win.exe" "$PACKAGE_DIR/"
    echo "      ✓ Eseguibile Windows incluso"
fi

# Copy .env template
cp "$BRIDGE_DIR/.env.example" "$PACKAGE_DIR/.env.template"
echo "      ✓ Template configurazione incluso"

# Step 4: Create ZIP
echo "[4/4] Creazione archivio ZIP..."
cd "$DIST_DIR"
rm -f "$OUTPUT_ZIP"

if command -v zip &> /dev/null; then
    cd package
    zip -r "$OUTPUT_ZIP" . -x ".*"
    cd ..
else
    # Fallback to tar+gzip then convert
    cd package
    tar -czf "../ElementMedica-Bridge-Setup.tar.gz" .
    cd ..
    echo "      [NOTA] 'zip' non disponibile — creato .tar.gz"
    OUTPUT_ZIP="$DIST_DIR/ElementMedica-Bridge-Setup.tar.gz"
fi

# Cleanup
rm -rf "$PACKAGE_DIR"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  Build completata!"
echo "  Output: $OUTPUT_ZIP"
SIZE=$(du -h "$OUTPUT_ZIP" | cut -f1)
echo "  Dimensione: $SIZE"
echo "══════════════════════════════════════════════════════════════"
