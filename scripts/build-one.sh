#!/usr/bin/env bash

# 使用方法：
# ./push.x <platform>
# 例如：
# ./push.x mac-uni 1.0.0
# ./push.x mac-sep 1.0.0

# 参数检查
if [ $# -lt 2 ]; then
  echo "用法: $0 <platform>"
  echo "platform: mac-uni | mac-sep"
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
    LOCAL_FILE="out/AITALK-mac-7.1.3-nightly.3-arm64-${BUILD_NUMBER}.dmg"
    ./scripts/build-dmg-no-sandbox.sh mac-sep
    # 检查结果
    if [ $? -eq 0 ]; then
      echo "✅ 编译成功: `ls -lrth $LOCAL_FILE`"
    else
      echo "❌ 编译失败"
      exit 1
    fi
    REMOTE_FILE="${REMOTE_DIR}/mac/AITALK-mac_${DATE}_${VERSION}_${BUILD_NUMBER}_arm64.dmg"
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