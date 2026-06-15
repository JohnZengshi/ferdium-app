#!/bin/bash
# ----------------------------------------------------------------------------
# build-macos-production.sh
# ----------------------------------------------------------------------------

set -euo pipefail

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}=== $1 ===${NC}"; }
ok() { echo -e "  ${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}!!! $1${NC}"; exit 1; }

# ── 配置 ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$PROJECT_ROOT/out"
ARCH=$( [[ "$(uname -m)" =~ "arm" ]] && echo "arm64" || echo "x64" )

step "构建 macOS 正式版 (Arch: $ARCH)"

cd "$PROJECT_ROOT"

APP_VERSION=$(node -p 'require("./package.json").version')
BUILD_NUMBER=$(git rev-list --count HEAD)
GIT_HASH=$(git rev-parse --short HEAD)

echo "版本: $APP_VERSION | 构建号: $BUILD_NUMBER | Hash: $GIT_HASH"

rm -rf "$OUT_DIR"/* || true

step "执行打包 (Electron Builder)"
pnpm exec preval-build-info-cli
node esbuild.mjs

# 核心秘诀：-c.mac.identity=null
# 告诉 builder 彻底放弃签名（也不要去找系统证书），但是把完整的 DMG 打出来
npx electron-builder --mac dmg --"$ARCH" --publish never -c.mac.identity=null

# ── 后处理：DMG 重命名 ──────────────────────────────────────────────────
DMG_FILE=$(find "$OUT_DIR" -name "*.dmg" -print -quit)
[[ -z "$DMG_FILE" ]] && fail "DMG 构建失败，未找到产物。"

NEW_DMG_NAME="Aitalk-mac-bundle-${APP_VERSION}-${BUILD_NUMBER}-${ARCH}.dmg"
mv "$DMG_FILE" "$OUT_DIR/$NEW_DMG_NAME"

ok "产物已生成: out/$NEW_DMG_NAME"
echo -e "\n${GREEN}构建完成!${NC}"
