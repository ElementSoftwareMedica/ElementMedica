#!/bin/bash

# Test login con credenziali attuali
echo "Testing login with admin@example.com / Admin123!..."

response=$(curl -s -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"

# Estrai il token se presente
token=$(echo "$response" | jq -r '.token // empty' 2>/dev/null)

if [ ! -z "$token" ] && [ "$token" != "null" ]; then
  echo "\nLogin successful! Token obtained."
  echo "Token: $token"
else
  echo "\nLogin failed or no token received."
fi