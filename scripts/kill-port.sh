#!/usr/bin/env bash
# -------------------------------------------------------------------
# kill-port.sh — kill processes occupying a given port
#
# Usage:  ./scripts/kill-port.sh [port]
#           (default port: 8080)
#
# Example:
#   ./scripts/kill-port.sh          # kill whatever is on 8080
#   ./scripts/kill-port.sh 3000     # kill whatever is on 3000
# -------------------------------------------------------------------

set -euo pipefail

PORT="${1:-8080}"

# Always kill these Ferdium-related ports
LIVERELOAD_PORT=35729
FERDIUM_SERVER_PORT=46569
FERDIUM_TODOS_PORT=4000
FERDIUM_DEV_API_PORT=3000

free_port() {
  local port=$1
  local label=$2
  if lsof -i :"${port}" -P -n 2>/dev/null | grep -q LISTEN; then
    echo "→ Port ${port}${label:+ ($label)} is in use. Killing process(es) ..."
    PIDS=$(lsof -ti :"${port}" 2>/dev/null || true)
    if [ -n "${PIDS}" ]; then
      # shellcheck disable=SC2086
      kill ${PIDS} 2>/dev/null || true
      sleep 1
      # shellcheck disable=SC2086
      kill -9 ${PIDS} 2>/dev/null || true
      echo "✓ Port ${port} freed."
    fi
  else
    echo "→ Port ${port} is free."
  fi
}

free_port "$PORT" "user-specified / esbuild dev server"
free_port "$LIVERELOAD_PORT" "esbuild/gulp-livereload"
free_port "$FERDIUM_SERVER_PORT" "Ferdium internal server"
free_port "$FERDIUM_TODOS_PORT" "Ferdium todos frontend"
free_port "$FERDIUM_DEV_API_PORT" "Ferdium dev API"
