#!/bin/bash

echo "🔐 Test login admin con nuova password..."
echo "======================================"

# Test login con nuove credenziali
echo "📧 Testing login: admin@example.com"
echo "🔑 Password: Admin123!"
echo ""

curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@example.com",
    "password": "Admin123!"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq .

echo ""
echo "✅ Test completato!"