#!/bin/bash

# Test semplice per estrarre il token
echo "Getting token..."

curl -s -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' > login_response.json

echo "Login response saved to login_response.json"
echo "Content:"
cat login_response.json | jq .

echo "\nExtracting token..."
token=$(cat login_response.json | jq -r '.data.accessToken')
echo "Token: ${token:0:50}..."

if [ "$token" != "null" ] && [ ! -z "$token" ]; then
  echo "\nTesting verify endpoint..."
  curl -s -X GET http://localhost:4003/api/v1/auth/verify \
    -H "Authorization: Bearer $token" | jq .
else
  echo "No valid token found"
fi