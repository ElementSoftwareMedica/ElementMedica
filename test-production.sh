#!/bin/bash
# Test produzione completo per elementformazione.com

set -e
BASE_URL="https://elementformazione.com"
COOKIE_FILE=$(mktemp)

echo "=== Test Produzione Completo ==="
echo "Base URL: $BASE_URL"
echo "Cookie file: $COOKIE_FILE"

# 1. Test health endpoints
echo -e "\n1. Health Checks:"
echo -n "  - Frontend health: "
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health"
echo -n "  - API health: "
curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health"

# 2. Test preflight CORS
echo -e "\n\n2. CORS Preflight Test:"
CORS_RESULT=$(curl -sS -I -X OPTIONS "$BASE_URL/api/v1/auth/login" \
  -H "Origin: $BASE_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type")
echo "  - Status: $(echo "$CORS_RESULT" | head -n1)"
echo "  - CORS Origin: $(echo "$CORS_RESULT" | grep -i "access-control-allow-origin" || echo "NOT FOUND")"

# 3. Login test
echo -e "\n3. Login Test:"
LOGIN_RESPONSE=$(curl -sS -i -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Origin: $BASE_URL" \
  -H "Content-Type: application/json" \
  --data '{"identifier":"admin@example.com","password":"Admin123!"}' \
  -c "$COOKIE_FILE")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | head -n1)
echo "  - Login status: $LOGIN_STATUS"

if echo "$LOGIN_STATUS" | grep -q "200"; then
  echo "  ✅ Login successful"
  
  # Estrae access token e tenantId per richieste autenticate (Bearer + multi-tenant)
  LOGIN_JSON=$(curl -sS -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Origin: $BASE_URL" \
    -H "Content-Type: application/json" \
    --data '{"identifier":"admin@example.com","password":"Admin123!"}')
  
  # Estrazione robusta token: supporta tokens.access_token (snake_case) e tokens.accessToken (camelCase)
  ACCESS_TOKEN=$(echo "$LOGIN_JSON" | node -e "let data=''; process.stdin.on('data', c=>data+=c).on('end', ()=>{try{const j=JSON.parse(data); const t=j.tokens||{}; console.log(t.access_token||t.accessToken||j.access_token||j.accessToken||'');}catch(e){console.log('');}})")
  
  if [ -z "$ACCESS_TOKEN" ]; then
    # Fallback con sed/grep: cerca access_token o accessToken dentro tokens
    ACCESS_TOKEN=$(echo "$LOGIN_JSON" | sed -n 's/.*"tokens"[^{]*{[^}]*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
  fi
  if [ -z "$ACCESS_TOKEN" ]; then
    ACCESS_TOKEN=$(echo "$LOGIN_JSON" | sed -n 's/.*"tokens"[^{]*{[^}]*"accessToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
  fi

  # Estrazione tenantId per header X-Tenant-ID
  TENANT_ID=$(echo "$LOGIN_JSON" | node -e "let data=''; process.stdin.on('data', c=>data+=c).on('end', ()=>{try{const j=JSON.parse(data); console.log((j.user&&j.user.tenantId)||'');}catch(e){console.log('');}})")
  if [ -z "$TENANT_ID" ]; then
    TENANT_ID=$(echo "$LOGIN_JSON" | sed -n 's/.*"user"[^{]*{[^}]*"tenantId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
  fi

  if [ -z "$ACCESS_TOKEN" ]; then
    echo "  ⚠️  Impossibile estrarre access token dalla risposta di login."
    echo "  Risposta login: $(echo "$LOGIN_JSON" | head -c 200)..."
  else
    echo "  ℹ️  Access token ottenuto (lunghezza: ${#ACCESS_TOKEN})"
  fi

  if [ -z "$TENANT_ID" ]; then
    echo "  ⚠️  Impossibile estrarre tenantId dalla risposta di login. Proverò con header vuoto."
  else
    echo "  ℹ️  Tenant ID ottenuto: $TENANT_ID"
  fi
  
  # 4. Dashboard tests con Bearer token + X-Tenant-ID
  echo -e "\n4. Dashboard Tests (Authenticated con Bearer):"
  
  echo -n "  - Stats endpoint: "
  STATS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/dashboard/stats" -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Tenant-ID: $TENANT_ID")
  echo "$STATS_CODE"
  
  echo -n "  - Companies endpoint: "
  COMPANIES_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/dashboard/companies" -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Tenant-ID: $TENANT_ID")
  echo "$COMPANIES_CODE"
  
  echo -n "  - Tenants current: "
  TENANT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/tenants/current" -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Tenant-ID: $TENANT_ID")
  echo "$TENANT_CODE"
  
  # 5. Test some actual data
  echo -e "\n5. Sample Data Tests:"
  echo "  - Dashboard stats:"
  curl -sS "$BASE_URL/api/dashboard/stats" -H "Authorization: Bearer $ACCESS_TOKEN" -H "X-Tenant-ID: $TENANT_ID" | head -c 200
  echo "..."
  
else
  echo "  ❌ Login failed"
  echo "Response preview:"
  echo "$LOGIN_RESPONSE" | head -20
fi

# 6. Test www redirect
echo -e "\n\n6. WWW Redirect Test:"
WWW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "https://www.elementformazione.com/health")
echo "  - www.elementformazione.com health: $WWW_STATUS"

# Cleanup
rm -f "$COOKIE_FILE"

echo -e "\n=== Test Completato ==="