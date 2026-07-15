#!/usr/bin/env bash

show_help() {
  cat << 'EOF'
build-one.sh — AITALK 一键打包脚本

用法:
  ./scripts/build-one.sh <platform>

参数:
  platform    打包目标平台

可用平台:
  mac-uni     生成 Universal 通用包 (x64 + arm64 合并，体积约 2 倍)
  mac-sep     生成两个独立包 (x64 和 arm64 分开)
  windows     生成 Windows x64 安装包 (待实现)

示例:
  ./scripts/build-one.sh mac-uni
  ./scripts/build-one.sh mac-sep
  ./scripts/build-one.sh --help

版本管理:
  版本号统一从 package.json 读取。
  构建前请用 pnpm version 更新版本号:

  pnpm version patch            # 7.1.3 → 7.1.4  (小修)
  pnpm version minor            # 7.1.3 → 7.2.0  (功能)
  pnpm version major            # 7.1.3 → 8.0.0  (大版本)
  pnpm run version:beta                 # 7.1.3 → 7.1.4-beta.0 (测试版)

  上述命令会自动更新 package.json、commit 并打 tag。
  完整流程:

    pnpm run version:beta
    ./scripts/build-one.sh mac-sep
    git push --tags origin main

说明:
  - 脚本会自动构建并将产物重命名为带日期、版本号、构建号的归档文件
  - 输出目录: out/mac/ 或 out/windows/
  - 底层调用 build-dmg-no-sandbox.sh 完成 DMG 打包
EOF
  exit 0
}

case "${1:-}" in
  --help|-h)
    show_help
    ;;
esac

if [ $# -lt 1 ]; then
  echo "用法: $0 <platform>"
  echo "platform: mac-uni | mac-sep | windows"
  echo "运行 '$0 --help' 查看详细帮助"
  exit 1
fi

# if [ $# -gt 1 ]; then
#   echo "❌ 不再支持版本号参数: $2"
#   echo "版本号统一由 package.json 管理。请先用 pnpm version 更新版本号，再打包。"
#   echo "示例:"
#   echo "      pnpm run version:beta"
#   echo "  $0 $1"
#   echo "运行 '$0 --help' 查看 pnpm version 参数说明"
#   exit 1
# fi

PLATFORM=$1
ISPROD=$2

#切换目录
cd "$(dirname "$0")/../"
echo "当前目录: $(pwd)"
BUILD_NUMBER=$(git rev-list --count HEAD)
APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ -z "$APP_VERSION" ]; then
  echo "⚠️ 警告: node 未安装或 package.json 读取失败，APP_VERSION 为空"
fi

# 自动生成日期时分 (格式: YYYYMMDDHHMM)
DATE=$(date +"%Y%m%d%H%M")

# 公共配置
REMOTE_DIR=out
MAC_APP_PATH="out/mac/AITALK.app"

generate_local_update_files() {
  local source_path="${1:-$MAC_APP_PATH}"
  echo "正在生成本地更新文件: $source_path ..."
  ./scripts/generate-local-update-yml.sh "$source_path"
}


if [ -z "$ISPROD" ]; then
    echo "使用内部环境配置"
else
    mv .env .env.development.local
    cp .env.production.local .env
fi


# 根据平台选择不同的包路径和文件名
case "$PLATFORM" in
  mac-uni)
    LOCAL_FILE="out/AITALK-mac-${APP_VERSION}-universal-${BUILD_NUMBER}.dmg"
    ./scripts/build-dmg-no-sandbox.sh mac-uni
    # 检查结果
    if [ $? -eq 0 ]; then
      echo "✅ 编译成功: `ls -lrth $LOCAL_FILE`"
      generate_local_update_files
    else
      echo "❌ 编译失败"
      exit 1
    fi
    REMOTE_FILE="${REMOTE_DIR}/mac/AITALK-mac_${DATE}_${APP_VERSION}_${BUILD_NUMBER}_universal.dmg"
    ;;
  mac-sep)
    ./scripts/build-dmg-no-sandbox.sh mac-sep
    if [ $? -ne 0 ]; then
      echo "❌ 编译失败"
      exit 1
    fi
    echo "✅ 编译成功"
    generate_local_update_files
    mkdir -p "${REMOTE_DIR}/mac"
    for ARCH in x64 arm64; do
      LOCAL_FILE="out/AITALK-mac-${APP_VERSION}-${ARCH}-${BUILD_NUMBER}.dmg"
      if [ -f "$LOCAL_FILE" ]; then
        REMOTE_FILE="${REMOTE_DIR}/mac/AITALK-mac_${DATE}_${APP_VERSION}_${BUILD_NUMBER}_${ARCH}.dmg"
        echo "正在更名 $LOCAL_FILE 到 $REMOTE_FILE ..."
        mv "$LOCAL_FILE" "$REMOTE_FILE"
        echo "✅ 打包成功: $REMOTE_FILE"
      fi
    done
    exit 0
    ;;
  windows)
    echo "正在构建 Windows 安装包..."
    SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/build-windows-installer.ps1"
    if ! powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w "$SCRIPT_PATH" 2>/dev/null || echo "$SCRIPT_PATH")" -SkipVer; then
      echo "❌ 编译失败"
      exit 1
    fi

    LOCAL_FILE=$(ls -t out/*-win-AutoSetup-*.exe 2>/dev/null | head -1)
    if [ -z "$LOCAL_FILE" ]; then
      echo "❌ 未找到生成的安装包"
      exit 1
    fi
    echo "✅ 编译成功: $(ls -lh "$LOCAL_FILE" | awk '{print $5, $NF}')"
    generate_local_update_files "$LOCAL_FILE"
    # 从 installer 文件名中提取版本号 (e.g. "AITALK-win-AutoSetup-1.0.8-beta.0-7665-x64.exe")
    # 不依赖 bash 中 node 可用性，直接从 PowerShell 生成的文件名解析
    WIN_APP_VERSION=$(echo "$LOCAL_FILE" | sed -n 's/.*AutoSetup-\([0-9.]*\(-beta\.[0-9]*\)*\)-[0-9]*-x64\.exe$/\1/p')
    if [ -z "$WIN_APP_VERSION" ]; then
      echo "⚠️ 无法从文件名提取版本号，回退到 APP_VERSION (可能为空)"
      WIN_APP_VERSION="$APP_VERSION"
    fi
    REMOTE_FILE="${REMOTE_DIR}/windows/AITALK-win_${DATE}_${WIN_APP_VERSION}_${BUILD_NUMBER}_x64.exe"
    ;;
  *)
    echo "未知平台: $PLATFORM"
    exit 1
    ;;
esac

# 执行更名
echo "正在更名 $LOCAL_FILE 到 $REMOTE_FILE ..."
mkdir -p "$(dirname "$REMOTE_FILE")"
mv $LOCAL_FILE $REMOTE_FILE

# 检查结果
if [ $? -eq 0 ]; then
  echo "✅ 打包成功: $REMOTE_FILE"
else
  echo "❌ 打包失败"
fi

if [ -z "$ISPROD" ]; then
  echo "使用内部环境配置"
else
  mv .env.development.local .env
fi