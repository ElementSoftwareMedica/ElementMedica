#!/bin/bash

echo "🧪 Test solo endpoint PUT"

# Ottieni token
TOKEN=$(curl -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@example.com", "password": "Admin123!"}' \
  -s | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:50}..."

# Test endpoint PUT con logging
echo "Sending PUT request..."
curl -X PUT http://localhost:4001/api/roles/ADMIN/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"permissions": ["VIEW_COMPANIES"]}' \
  -v