#!/bin/bash

echo "🔍 Testing API Server Health..."
curl -s http://localhost:4001/health

echo -e "\n\n🔐 Testing Login..."
response=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}')

echo "Login Response:"
echo "$response"

# Estrai il token se presente
token=$(echo "$response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$token" ]; then
    echo -e "\n✅ Login successful! Token received."
    echo -e "\n🔍 Testing authenticated endpoint..."
    
    auth_response=$(curl -s http://localhost:4001/api/persons \
      -H "Authorization: Bearer $token" \
      -H "X-Tenant-ID: 1")
    
    echo "Persons API Response:"
    echo "$auth_response"
else
    echo -e "\n❌ Login failed - No token received"
fi

echo -e "\n\n🔍 Checking server processes..."
ps aux | grep -E "(api-server|proxy-server)" | grep -v grep