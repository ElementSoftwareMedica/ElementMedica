#!/bin/bash

# Test API endpoint directly on API server
echo "Testing API server directly on port 4001..."

# Test health endpoint first
echo "\n1. Testing health endpoint:"
curl -s http://localhost:4001/health | head -c 200
echo "\n"

# Test user preferences endpoint without auth
echo "\n2. Testing /api/user/preferences without auth:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:4001/api/user/preferences

# Test via proxy
echo "\n3. Testing via proxy on port 4003:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:4003/api/user/preferences

echo "\nDone."