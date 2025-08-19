#!/bin/bash

echo "🔍 Test endpoint PUT per permessi ruolo ADMIN"

# Ottieni token
echo "📝 Ottengo token di autenticazione..."
LOGIN_RESPONSE=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@example.com", "password": "Admin123!"}' \
  -s)

echo "Login response: $LOGIN_RESPONSE"

# Estrai token senza jq
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Errore: Token non ottenuto"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token ottenuto: ${TOKEN:0:50}..."

# Test endpoint PUT
echo "🧪 Test endpoint PUT..."
RESPONSE=$(curl -X PUT http://localhost:4001/api/roles/ADMIN/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"permissions": ["VIEW_COMPANIES"]}' \
  -w "HTTP_CODE:%{http_code}" \
  -s)

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "📊 Risultato:"
echo "   Status Code: $HTTP_CODE"
echo "   Response Body: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS: Endpoint PUT funziona correttamente!"
else
  echo "❌ ERROR: Endpoint PUT ha restituito errore $HTTP_CODE"
fi

# Test endpoint GET
echo "🔍 Test endpoint GET..."
GET_RESPONSE=$(curl -X GET http://localhost:4001/api/roles/ADMIN/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -w "HTTP_CODE:%{http_code}" \
  -s)

GET_HTTP_CODE=$(echo "$GET_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
GET_BODY=$(echo "$GET_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "📊 Risultato GET:"
echo "   Status Code: $GET_HTTP_CODE"
echo "   Response Body: $GET_BODY"

if [ "$GET_HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS: Endpoint GET funziona correttamente!"
else
  echo "❌ ERROR: Endpoint GET ha restituito errore $GET_HTTP_CODE"
fi