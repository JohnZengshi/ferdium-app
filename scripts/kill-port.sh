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

# Always kill the livereload port (35729) used by esbuild/gulp-livereload
LIVERELOAD_PORT=35729

# macOS: use lsof to find and kill processes on the port
if lsof -i :"${PORT}" -P -n 2>/dev/null | grep -q LISTEN; then
  echo "→ Port ${PORT} is in use. Killing process(es) ..."
  PIDS=$(lsof -ti :"${PORT}" 2>/dev/null || true)
  if [ -n "${PIDS}" ]; then
    # shellcheck disable=SC2086
    kill ${PIDS} 2>/dev/null || true
    sleep 1
    # Force-kill any survivors
    # shellcheck disable=SC2086
    kill -9 ${PIDS} 2>/dev/null || true
    echo "✓ Port ${PORT} freed."
  fi
else
  echo "→ Port ${PORT} is free."
fi

# Also kill the livereload port if it's in use
if lsof -i :"${LIVERELOAD_PORT}" -P -n 2>/dev/null | grep -q LISTEN; then
  echo "→ Port ${LIVERELOAD_PORT} (livereload) is in use. Killing process(es) ..."
  LRPIDS=$(lsof -ti :"${LIVERELOAD_PORT}" 2>/dev/null || true)
  if [ -n "${LRPIDS}" ]; then
    # shellcheck disable=SC2086
    kill ${LRPIDS} 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -9 ${LRPIDS} 2>/dev/null || true
    echo "✓ Port ${LIVERELOAD_PORT} freed."
  fi
fi
