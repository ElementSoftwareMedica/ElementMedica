#!/bin/bash

echo "=== Test Preventivi Endpoint ==="
echo

# 1. Login
echo "1. Login..."
TOKEN=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' | jq -r '.tokens.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed!"
  exit 1
fi

echo "✅ Token ottenuto: ${TOKEN:0:30}..."
echo

# 2. Test GET /api/preventivi
echo "2. Test GET /api/preventivi..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X GET "http://localhost:4001/api/preventivi" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "Status: $HTTP_CODE"
echo "Body:"
echo "$BODY" | jq '.'
echo

# 3. Verifica status
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Request completata con successo!"
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ 403 Forbidden - Permessi mancanti"
  exit 1
else
  echo "⚠️ Status code: $HTTP_CODE"
  if echo "$BODY" | jq -e '.error' > /dev/null 2>&1; then
    echo "❌ Errore nella response"
    exit 1
  fi
fi
