#!/bin/bash

echo "🔍 Debug Permessi Admin - Test Rapido"
echo "====================================="
echo ""

# 1. Login come admin - provo diversi endpoint
echo "1️⃣ Login come admin..."

# Provo prima con /api/v1/auth/login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

if [ $? -ne 0 ] || [ -z "$LOGIN_RESPONSE" ] || echo "$LOGIN_RESPONSE" | grep -q "error"; then
  echo "⚠️ Primo tentativo fallito, provo con /api/auth/login..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"admin@example.com","password":"Admin123!"}')
fi

if [ $? -ne 0 ]; then
  echo "❌ Errore durante il login"
  exit 1
fi

# Provo diversi formati di token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi
if [ -z "$TOKEN" ]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Token non trovato nella risposta di login"
  echo "Risposta: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"

# 2. Ottieni permessi utente
echo ""
echo "2️⃣ Recupero permessi utente..."
PERMISSIONS_RESPONSE=$(curl -s -X GET http://localhost:4001/api/auth/permissions \
  -H "Authorization: Bearer $TOKEN")

if [ $? -ne 0 ]; then
  echo "❌ Errore durante il recupero permessi"
  exit 1
fi

echo "✅ Permessi recuperati"

# 3. Controlla permessi specifici problematici
echo ""
echo "3️⃣ Controllo permessi problematici..."
echo "Permessi trovati:"
echo "$PERMISSIONS_RESPONSE" | grep -o '"[A-Z_]*":\s*true' | head -20

# 4. Test entità disponibili
echo ""
echo "4️⃣ Test entità disponibili..."
ENTITIES_RESPONSE=$(curl -s -X GET http://localhost:4001/api/advanced-permissions/entities \
  -H "Authorization: Bearer $TOKEN")

if [ $? -eq 0 ]; then
  echo "✅ Entità recuperate"
  echo "Entità trovate:"
  echo "$ENTITIES_RESPONSE" | grep -o '"name":"[^"]*"' | head -10
  
  # Controlla entità problematiche
  echo ""
  echo "Entità problematiche:"
  for entity in "form_templates" "form_submissions" "public_cms" "courses"; do
    if echo "$ENTITIES_RESPONSE" | grep -q "\"name\":\"$entity\""; then
      echo "   $entity: ✅ Trovata"
    else
      echo "   $entity: ❌ Mancante"
    fi
  done
else
  echo "❌ Errore durante il recupero entità"
fi

# 5. Test permessi ruolo admin
echo ""
echo "5️⃣ Test permessi ruolo Admin..."
ROLE_PERMISSIONS_RESPONSE=$(curl -s -X GET http://localhost:4001/api/v1/advanced-permissions/roles/Admin/permissions \
  -H "Authorization: Bearer $TOKEN")

if [ $? -eq 0 ]; then
  echo "✅ Permessi ruolo recuperati"
  echo "Permessi per entità problematiche:"
  for entity in "form_templates" "form_submissions" "public_cms"; do
    count=$(echo "$ROLE_PERMISSIONS_RESPONSE" | grep -c "\"entity\":\"$entity\"")
    echo "   $entity: $count permessi"
  done
else
  echo "❌ Errore durante il recupero permessi ruolo"
fi

echo ""
echo "✅ Debug completato"