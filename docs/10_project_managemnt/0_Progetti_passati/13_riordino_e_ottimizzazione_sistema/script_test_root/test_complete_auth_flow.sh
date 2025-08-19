#!/bin/bash

echo "🔐 Test completo flusso autenticazione con nuove credenziali"
echo "========================================================"

# Step 1: Login
echo "📧 Step 1: Login con admin@example.com / Admin123!"
echo ""

LOGIN_RESPONSE=$(curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "Admin123!"
  }' \
  -s)

echo "Login Response:"
echo $LOGIN_RESPONSE | jq .

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login fallito - token non ottenuto"
  exit 1
fi

echo ""
echo "✅ Login riuscito! Token ottenuto."
echo "🔑 Access Token: ${ACCESS_TOKEN:0:50}..."

# Step 2: Verify token
echo ""
echo "📋 Step 2: Verifica token..."
echo ""

curl -X GET http://localhost:4003/api/v1/auth/verify \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq .

echo ""
echo "✅ Test flusso autenticazione completato!"
echo "🎯 Credenziali aggiornate e funzionanti:"
echo "   📧 Email: admin@example.com"
echo "   🔑 Password: Admin123!"