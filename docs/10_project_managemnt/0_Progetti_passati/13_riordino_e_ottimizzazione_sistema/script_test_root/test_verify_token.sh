#!/bin/bash

# Test verifica token
echo "Testing token verification..."

# Prima ottieni il token
login_response=$(curl -s -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

# Debug: mostra la risposta di login
echo "Login response:"
echo "$login_response" | jq . 2>/dev/null || echo "$login_response"

# Estrai il token (prova diversi metodi)
token=$(echo "$login_response" | jq -r '.token' 2>/dev/null)
if [ -z "$token" ] || [ "$token" = "null" ]; then
  token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

echo "Extracted token: ${token:0:50}..."

if [ ! -z "$token" ] && [ "$token" != "null" ]; then
  echo "Token obtained: ${token:0:50}..."
  
  # Testa la verifica del token
  echo "\nTesting token verification..."
  verify_response=$(curl -s -X GET http://localhost:4003/api/v1/auth/verify \
    -H "Authorization: Bearer $token")
  
  echo "Verify response:"
  echo "$verify_response" | jq . 2>/dev/null || echo "$verify_response"
else
  echo "Failed to obtain token"
fi