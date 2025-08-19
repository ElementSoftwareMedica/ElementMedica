#!/bin/bash

echo "🔄 Ottenendo nuovo token..."

# Login per ottenere un nuovo token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

echo "📋 Risposta login:"
echo "$LOGIN_RESPONSE" | jq .

# Estrai il token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // .token // .data.accessToken // .data.token // empty')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo "✅ Token ottenuto: ${TOKEN:0:50}..."
    
    echo "🔍 Testando token con verify..."
    
    VERIFY_RESPONSE=$(curl -s -X GET http://localhost:4003/api/v1/auth/verify \
      -H "Authorization: Bearer $TOKEN")
    
    echo "📋 Risposta verify:"
    echo "$VERIFY_RESPONSE" | jq .
    
else
    echo "❌ Impossibile ottenere il token"
    echo "Risposta completa: $LOGIN_RESPONSE"
fi