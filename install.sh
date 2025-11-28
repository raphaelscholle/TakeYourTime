#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install dependencies" >&2
  exit 1
fi

echo "Installing project dependencies..."
npm install
