#!/usr/bin/env bash
set -euo pipefail

API_PORT=${API_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

cleanup() {
  if [[ -n "${api_pid:-}" ]]; then
    kill "$api_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT

printf "Starting backend on http://localhost:%s and frontend on http://localhost:%s\n" "$API_PORT" "$FRONTEND_PORT"

npm run start:api --silent &
api_pid=$!

npm run dev -- --host --port "$FRONTEND_PORT"
