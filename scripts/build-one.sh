#!/usr/bin/env bash

show_help() {
  cat << 'EOF'
build-one.sh — AITALK 一键打包脚本

用法:
  ./scripts/build-one.sh <platform> <version>

参数:
  platform    打包目标平台
  version     版本号 (如 1.0.0)

可用平台:
  mac-uni     生成 Universal 通用包 (x64 + arm64 合并，体积约 2 倍)
  mac-sep     生成两个独立包 (x64 和 arm64 分开)
  windows     生成 Windows x64 安装包 (待实现)

示例:
  ./scripts/build-one.sh mac-uni 1.0.0
   ./scripts/build-one.sh mac-sep 1.0.7
  ./scripts/build-one.sh --help

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

if [ $# -lt 2 ]; then
  echo "用法: $0 <platform> <version>"
  echo "platform: mac-uni | mac-sep | windows"
  echo "运行 '$0 --help' 查看详细帮助"
  exit 1
fi

PLATFORM=$1
VERSION=$2

#切换目录
cd "$(dirname "$0")/../"
echo "当前目录: $(pwd)"
BUILD_NUMBER=$(git rev-list --count HEAD)

# 自动生成日期时分 (格式: YYYYMMDDHHMM)
DATE=$(date +"%Y%m%d%H%M")

# 公共配置
REMOTE_DIR=out

# 根据平台选择不同的包路径和文件名
case "$PLATFORM" in
  mac-uni)
    LOCAL_FILE="out/AITALK-mac-7.1.3-nightly.3-universal-${BUILD_NUMBER}.dmg"
    ./scripts/build-dmg-no-sandbox.sh mac-uni
    # 检查结果
    if [ $? -eq 0 ]; then
      echo "✅ 编译成功: `ls -lrth $LOCAL_FILE`"
    else
      echo "❌ 编译失败"
      exit 1
    fi
    REMOTE_FILE="${REMOTE_DIR}/mac/AITALK-mac_${DATE}_${VERSION}_${BUILD_NUMBER}_universal.dmg"
    ;;
  mac-sep)
    ./scripts/build-dmg-no-sandbox.sh mac-sep
    if [ $? -ne 0 ]; then
      echo "❌ 编译失败"
      exit 1
    fi
    echo "✅ 编译成功"
    mkdir -p "${REMOTE_DIR}/mac"
    for ARCH in x64 arm64; do
      LOCAL_FILE="out/AITALK-mac-7.1.3-nightly.3-${ARCH}-${BUILD_NUMBER}.dmg"
      if [ -f "$LOCAL_FILE" ]; then
        REMOTE_FILE="${REMOTE_DIR}/mac/AITALK-mac_${DATE}_${VERSION}_${BUILD_NUMBER}_${ARCH}.dmg"
        echo "正在更名 $LOCAL_FILE 到 $REMOTE_FILE ..."
        mv "$LOCAL_FILE" "$REMOTE_FILE"
        echo "✅ 打包成功: $REMOTE_FILE"
      fi
    done
    exit 0
    ;;
  windows)
    LOCAL_FILE="out/AITALK-win-AutoSetup-7.1.3-nightly.3-x64-${BUILD_NUMBER}.exe "
    # windows 待编译
    # 检查结果
    if [ $? -eq 0 ]; then
      echo "✅ 编译成功: `ls -lrth $LOCAL_FILE`"
    else
      echo "❌ 编译失败"
      exit 1
    fi
    REMOTE_FILE="${REMOTE_DIR}/windows/AITALK-win_${DATE}_${VERSION}_${BUILD_NUMBER}_x64.exe"
    ;;
  *)
    echo "未知平台: $PLATFORM"
    exit 1
    ;;
esac

# 执行更名
echo "正在更名 $LOCAL_FILE 到 $REMOTE_FILE ..."
mv $LOCAL_FILE $REMOTE_FILE

# 检查结果
if [ $? -eq 0 ]; then
  echo "✅ 打包成功: $REMOTE_FILE"
else
  echo "❌ 打包失败"
fi