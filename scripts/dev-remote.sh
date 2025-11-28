#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-${VITE_PORT:-5173}}"

# Collect external IPv4 addresses
get_ips() {
  local ips
  # Try hostname -I first (commonly available)
  if ips=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | grep -v '^127\.' ); then
    if [ -n "$ips" ]; then
      echo "$ips"
      return 0
    fi
  fi

  # Fallback to ip command
  if command -v ip >/dev/null 2>&1; then
    ips=$(ip -4 addr show scope global | awk '/inet /{print $2}' | cut -d/ -f1)
    if [ -n "$ips" ]; then
      echo "$ips"
      return 0
    fi
  fi

  return 1
}

IPS=$(get_ips || true)
PRIMARY=$(echo "$IPS" | head -n1)

if [ -z "${PRIMARY:-}" ]; then
  echo "No external IPv4 address detected. Using localhost."
  PRIMARY="localhost"
fi

echo "Starting Vite dev server accessible from your local network..."
echo "Primary URL: http://${PRIMARY}:${PORT}"

if [ -n "$IPS" ]; then
  ADDITIONAL=$(echo "$IPS" | tail -n +2)
  if [ -n "$ADDITIONAL" ]; then
    echo "Additional local addresses:"
    echo "$ADDITIONAL" | sed "s/^/- http:\/\//; s/\$/:${PORT}/"
  fi
fi

npm run dev -- --host 0.0.0.0 --port "${PORT}"
