#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to build the project" >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Dependencies missing. Running install.sh first..."
  ./install.sh
fi

echo "Building production bundle..."
npm run build
