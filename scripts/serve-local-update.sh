#!/usr/bin/env bash
set -euo pipefail

PORT=8888
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPDATE_DIR="$REPO_ROOT/temp"

usage() {
  cat <<EOF
AITALK 本地更新服务

用法:
  $0

选项:
  --help, -h    显示此帮助信息

服务启动后访问 http://localhost:${PORT}/ 获取更新清单
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -n "${1:-}" ]]; then
  usage >&2
  exit 1
fi

mkdir -p "$UPDATE_DIR"

if command -v lsof >/dev/null 2>&1 && lsof -ti:"$PORT" >/dev/null 2>&1; then
  lsof -ti:"$PORT" | xargs kill -9
fi

echo "=== Local Update Server ==="
echo "Directory: $UPDATE_DIR"
echo "Serving on http://localhost:${PORT}/"
echo "Press Ctrl+C to stop."
echo ""
cd "$UPDATE_DIR"
python3 -m http.server "$PORT"
