#!/bin/bash
# Script per rimozione sicura file obsoleti
# Data: 11 Novembre 2025

echo "🗑️  Rimozione File Obsoleti - ElementMedica Project"
echo "=================================================="
echo ""

# Array di file da rimuovere
FILES_TO_REMOVE=(
  "src/components/roles/RoleHierarchy.backup.tsx"
  "src/components/roles/RoleModal.backup.tsx"
  "src/components/roles/HierarchyTreeView.backup.tsx"
  "src/components/roles/RoleHierarchy.old.tsx"
  "src/components/roles/HierarchyTreeView.old.tsx"
  "src/components/shared/GenericImport.old.tsx"
  "src/components/shared/GenericImport.backup.tsx"
  "src/components/schedules/components/PreventiviModal.backup.tsx"
  "src/components/schedules/components/DocumentManager.backup.tsx"
  "src/components/templates/PlaceholderSelector.tsx.bak"
  "src/pages/settings/Templates_OLD_backup.tsx"
  "src/pages/Dashboard/Dashboard.lazy.tsx.bak"
)

TOTAL_SIZE=0
REMOVED_COUNT=0

echo "📋 File da rimuovere: ${#FILES_TO_REMOVE[@]}"
echo ""

# Rimozione con verifica
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    # Calcola dimensione
    SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
    
    echo "🗑️  Removing: $file ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
    rm "$file"
    REMOVED_COUNT=$((REMOVED_COUNT + 1))
  else
    echo "⚠️  Not found: $file"
  fi
done

echo ""
echo "✅ Rimozione completata!"
echo "   File rimossi: $REMOVED_COUNT"
echo "   Spazio liberato: $(numfmt --to=iec-i --suffix=B $TOTAL_SIZE 2>/dev/null || echo "${TOTAL_SIZE} bytes")"
echo ""
echo "🔍 Verifica errori TypeScript..."
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | xargs -I {} echo "   Errori TypeScript: {}"
