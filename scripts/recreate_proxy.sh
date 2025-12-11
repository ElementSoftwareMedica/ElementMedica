#!/bin/bash
# Script per ricreare il container proxy con CORS aggiornato

set -e

echo "📋 Salvataggio configurazione proxy..."
IMAGE=$(docker inspect app-proxy-1 --format='{{.Config.Image}}')
echo "Immagine: $IMAGE"

echo "🛑 Fermando container proxy..."
docker stop app-proxy-1 || true
docker rm app-proxy-1 || true

echo "🚀 Ricreando container proxy con CORS aggiornato..."
docker run -d \
  --name app-proxy-1 \
  --restart always \
  --network em-net \
  -e NODE_ENV=production \
  -e PROXY_HOST=0.0.0.0 \
  -e PROXY_PORT=4003 \
  -e API_HOST=0.0.0.0 \
  -e API_PORT=4001 \
  -e DOCUMENTS_HOST=0.0.0.0 \
  -e DOCUMENTS_PORT=4002 \
  -e API_SERVER_URL=http://api:4001 \
  -e DOCUMENTS_SERVER_URL=http://documents:4002 \
  -e FRONTEND_URL=https://www.elementformazione.com \
  -e PUBLIC_DOMAIN=www.elementformazione.com \
  -e 'CORS_ALLOWED_ORIGINS=https://www.elementformazione.com,https://elementformazione.com,http://www.elementformazione.com,http://elementformazione.com,https://elementmedica.com,https://www.elementmedica.com,http://elementmedica.com,http://www.elementmedica.com,https://128.140.15.15,http://128.140.15.15' \
  -e 'DATABASE_URL=postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true' \
  -e 'DIRECT_URL=postgresql://postgres.uywrlfkptcyhzoddsefg:Fulmicotone50!@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' \
  -e 'JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDI1MDIwMH0.nw0KeMgdZ0tBo2E8Tmy6WfBzUTGtrvlZ8X7G0w9o_gw' \
  -e 'JWT_REFRESH_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJpYXQiOjE3MjQyNDkzMDAsImV4cCI6MTcyNDg1NDEwMH0.GgXxI4epL7lE3sEXmQb7h3PHXJqydNzzOVYcTkg9jQw' \
  -e REDIS_ENABLED=false \
  -e TZ=Europe/Rome \
  $IMAGE

echo ""
echo "✅ Verifica nuovo container..."
docker ps | grep proxy
echo ""
echo "🔍 Verifica CORS..."
docker exec app-proxy-1 printenv CORS_ALLOWED_ORIGINS
