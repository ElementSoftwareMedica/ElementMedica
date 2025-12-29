#!/bin/bash

echo "=== Test Login e Verify Completo ==="
echo

# 1. Test Login
echo "1. Login..."
LOGIN_RESPONSE=$(curl -m 5 -s -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.access_token')
PERMISSIONS_COUNT=$(echo "$LOGIN_RESPONSE" | jq '.user.permissions | length')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Login fallito"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login OK"
echo "   Token length: ${#TOKEN}"
echo "   Permissions count: $PERMISSIONS_COUNT"
echo "   Has PREVENTIVI: $(echo "$LOGIN_RESPONSE" | jq '.user.permissions | any(. == "VIEW_PREVENTIVI")')"
echo

# 2. Test Verify
echo "2. Verify token..."
VERIFY_RESPONSE=$(curl -m 5 -s -X GET "http://localhost:4003/api/v1/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

IS_VALID=$(echo "$VERIFY_RESPONSE" | jq -r '.valid')

if [ "$IS_VALID" = "true" ]; then
  echo "✅ Token valido"
  echo "$VERIFY_RESPONSE" | jq '{
    valid: .valid,
    email: .user.email,
    globalRole: .user.globalRole,
    permissions_count: (.user.permissions | length)
  }'
else
  echo "❌ Token non valido"
  echo "$VERIFY_RESPONSE" | jq '.'
  exit 1
fi
echo

# 3. Test endpoint preventivi
echo "3. Test GET /api/preventivi..."
PREVENTIVI_RESPONSE=$(curl -m 5 -s -w "\nHTTP_CODE:%{http_code}" \
  -X GET "http://localhost:4003/api/preventivi" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$PREVENTIVI_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$PREVENTIVI_RESPONSE" | sed '/HTTP_CODE/d')

echo "   Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Endpoint preventivi OK"
  echo "$BODY" | jq '{
    success: .success,
    data_count: (.data | length),
    pagination: .pagination
  }'
elif [ "$HTTP_CODE" = "403" ]; then
  echo "❌ 403 Forbidden - Problema permessi"
  echo "$BODY" | jq '.'
  exit 1
else
  echo "⚠️ Status code inatteso: $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo
echo "=== Test completati con successo! ==="
