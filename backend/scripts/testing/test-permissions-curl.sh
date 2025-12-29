#!/bin/bash

echo "🔍 Testing permissions endpoint with curl..."

# 1. Login per ottenere il token
echo "📝 Step 1: Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default-company" \
  -d '{
    "identifier": "admin@example.com",
    "password": "Admin123!"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Estrai il token dalla risposta
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  exit 1
fi

echo "✅ Authentication successful, token: ${TOKEN:0:20}..."

# 2. GET current permissions
echo ""
echo "📝 Step 2: Getting current ADMIN permissions..."
GET_RESPONSE=$(curl -s -X GET http://localhost:4001/api/roles/ADMIN/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default-company")

echo "Current permissions: $GET_RESPONSE"

# 3. PUT test payload
echo ""
echo "📝 Step 3: Testing PUT with simple payload..."
PUT_PAYLOAD='{
  "permissions": [
    {
      "permissionId": "VIEW_COMPANIES",
      "granted": true,
      "scope": "all",
      "tenantIds": [],
      "fieldRestrictions": []
    },
    {
      "permissionId": "CREATE_COMPANIES", 
      "granted": true,
      "scope": "all",
      "tenantIds": [],
      "fieldRestrictions": []
    }
  ]
}'

echo "📤 Sending payload: $PUT_PAYLOAD"

PUT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X PUT http://localhost:4001/api/roles/ADMIN/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: default-company" \
  -d "$PUT_PAYLOAD")

echo "📥 PUT Response: $PUT_RESPONSE"

echo ""
echo "🔍 Test completed"