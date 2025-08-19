#!/bin/bash

# Test script per verificare l'endpoint verify
echo "Testing /api/v1/auth/verify endpoint..."

# Prima prova a fare login per ottenere un token valido
echo "\n=== LOGIN TEST ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@example.com", "password": "admin123"}')

echo "Login response: $LOGIN_RESPONSE"

# Estrai il token dalla risposta
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ No token found in login response"
  exit 1
fi

echo "✅ Token extracted: ${TOKEN:0:20}..."

# Ora testa l'endpoint verify
echo "\n=== VERIFY TEST ==="
VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4001/api/v1/auth/verify)

echo "Verify response: $VERIFY_RESPONSE"

# Controlla se contiene companies:read
if echo "$VERIFY_RESPONSE" | grep -q '"companies:read":true'; then
  echo "✅ Admin has companies:read permission"
else
  echo "❌ Admin does NOT have companies:read permission"
fi

echo "\nDone."