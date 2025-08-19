#!/bin/bash

echo "Testing login endpoint..."
echo "========================="

response=$(curl -s -w "\nHTTP_CODE:%{http_code}\n" \
  -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin@example.com", "password": "Admin123!"}')

echo "Response:"
echo "$response"
echo "========================="