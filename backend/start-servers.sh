#!/bin/bash
set -euo pipefail

# Ensure we run from the backend directory (where this script resides)
cd "$(dirname "$0")"

# Start API, Proxy, and Documents servers on fixed ports
export API_PORT=${API_PORT:-4001}
export PROXY_PORT=${PROXY_PORT:-4003}
export DOCS_PORT=${DOCS_PORT:-4002}

echo "Starting API server on port $API_PORT..."
node servers/api-server.js &
API_PID=$!

echo "Starting Proxy server on port $PROXY_PORT..."
node servers/proxy-server.js &
PROXY_PID=$!

echo "Starting Documents server on port $DOCS_PORT..."
node servers/documents-server.js &
DOCS_PID=$!

# Ensure all child processes are terminated on exit
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill "$API_PID" "$PROXY_PID" "$DOCS_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Portable wait-for-any implementation (Bash 3.2 compatible)
# Poll child PIDs and exit when any of them terminates
while true; do
  for pid in "$API_PID" "$PROXY_PID" "$DOCS_PID"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      # Retrieve exit status if possible
      if wait "$pid" 2>/dev/null; then
        STATUS=$?
      else
        # If already reaped, assume failure code 1
        STATUS=1
      fi
      exit "$STATUS"
    fi
  done
  sleep 1
done