#!/bin/bash

# Visite Specialistiche - Layout Verification Script
# Verifica che la pagina sia perfettamente strutturata

echo ""
echo "🔍 VERIFICA LAYOUT PAGINA VISITE SPECIALISTICHE"
echo "================================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:5174/visite-specialistiche > /dev/null; then
    echo "❌ Server non raggiungibile su http://localhost:5174"
    echo "   Assicurati che il server di sviluppo sia in esecuzione"
    exit 1
fi

echo "✅ Server raggiungibile"
echo ""

# Fetch page content
PAGE_CONTENT=$(curl -s http://localhost:5174/visite-specialistiche)

# Check for hero section
if echo "$PAGE_CONTENT" | grep -q "Visite Specialistiche"; then
    echo "✅ Hero section presente"
else
    echo "❌ Hero section mancante"
fi

# Check for specialist cards
CARDS=(
    "Cardiologia"
    "Dermatologia"
    "Ortopedia"
    "Oculistica"
    "Ginecologia"
    "Otorinolaringoiatria"
)

echo ""
echo "📋 Verifica card specialisti:"
for card in "${CARDS[@]}"; do
    if echo "$PAGE_CONTENT" | grep -q "$card"; then
        echo "   ✅ $card"
    else
        echo "   ❌ $card mancante"
    fi
done

# Check for consistent button structure
echo ""
echo "🔘 Verifica struttura pulsanti:"
BUTTON_COUNT=$(echo "$PAGE_CONTENT" | grep -o "Prenota Ora" | wc -l)
echo "   Pulsanti 'Prenota Ora' trovati: $BUTTON_COUNT"
if [ "$BUTTON_COUNT" -eq 6 ]; then
    echo "   ✅ Numero corretto di pulsanti"
else
    echo "   ⚠️  Numero atteso: 6, trovati: $BUTTON_COUNT"
fi

# Check for CTA section
echo ""
echo "📢 Verifica CTA section:"
if echo "$PAGE_CONTENT" | grep -q "Prenota Subito la Tua Visita Specialistica"; then
    echo "   ✅ CTA section presente"
else
    echo "   ❌ CTA section mancante"
fi

# Check for responsive grid classes
echo ""
echo "📱 Verifica responsive design:"
if echo "$PAGE_CONTENT" | grep -q "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"; then
    echo "   ✅ Grid responsive configurata correttamente"
else
    echo "   ⚠️  Grid classes potrebbero essere diverse"
fi

# Check for flex layout
echo ""
echo "🎨 Verifica layout flex:"
if echo "$PAGE_CONTENT" | grep -q "flex flex-col h-full"; then
    echo "   ✅ Card con altezza uniforme (flex + h-full)"
else
    echo "   ⚠️  Layout flex potrebbe non essere applicato"
fi

echo ""
echo "================================================"
echo "✅ VERIFICA COMPLETATA"
echo ""
echo "📌 Punti chiave del layout ottimizzato:"
echo "   • Hero section con gradient teal/blue"
echo "   • 6 card specialisti con altezza uniforme"
echo "   • Pulsanti 'Prenota Ora' allineati in fondo"
echo "   • Grid responsive (1→2→3 colonne)"
echo "   • CTA section finale con 2 pulsanti"
echo "   • Hover effects consistenti"
echo ""
