#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UPDATE_DIR="$REPO_ROOT/temp"
APP_NAME="AITALK"

usage() {
  cat <<EOF
AITALK 本地更新文件生成器

用法:
  $0 <源文件>
  $0 clean

源文件:
  <path>.zip   使用已有的 mac zip 包，从文件名提取版本号
  <path>.app   用 .app 目录生成 mac zip 和 yml，从 Info.plist 读取版本号
  <path>.exe   使用已有的 Windows 安装包生成 latest.yml / beta.yml

选项:
  --help, -h    显示此帮助信息

示例:
  $0 out/mac/AITALK.app
  $0 temp/AITALK-1.0.9-beta.999-mac.zip
  $0 out/AITALK-win-AutoSetup-1.0.10-7665-x64.exe
  $0 clean
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ "${1:-}" == "clean" ]]; then
  rm -rf "$UPDATE_DIR"
  echo "Cleaned $UPDATE_DIR"
  exit 0
fi

SOURCE_PATH="${1:-}"
if [[ -z "$SOURCE_PATH" ]]; then
  usage >&2
  exit 1
fi

SOURCE_APP=""
SOURCE_ZIP=""
SOURCE_EXE=""
PLATFORM=""

mkdir -p "$UPDATE_DIR"

if [[ "${SOURCE_PATH##*.}" == "zip" ]]; then
  if [[ ! -f "$SOURCE_PATH" ]]; then
    echo "Zip file not found: $SOURCE_PATH" >&2
    exit 1
  fi
  SOURCE_ZIP="$SOURCE_PATH"
  ZIP_BASENAME="$(basename "$SOURCE_ZIP")"
  VERSION=$(echo "$ZIP_BASENAME" | sed -nE "s/^${APP_NAME}-(.+)-mac\.zip$/\1/p")
  PLATFORM="mac"
elif [[ "${SOURCE_PATH##*.}" == "exe" ]]; then
  if [[ ! -f "$SOURCE_PATH" ]]; then
    echo "Exe file not found: $SOURCE_PATH" >&2
    exit 1
  fi
  SOURCE_EXE="$SOURCE_PATH"
  EXE_BASENAME="$(basename "$SOURCE_EXE")"
  VERSION=$(echo "$EXE_BASENAME" | sed -nE "s/^.*-AutoSetup-(.+)-[0-9]+-x64\.exe$/\1/p")
  if [[ -z "$VERSION" ]]; then
    VERSION=$(echo "$EXE_BASENAME" | sed -nE "s/^${APP_NAME}-win_[0-9]+_(.+)_[0-9]+_x64\.exe$/\1/p")
  fi
  if [[ -z "$VERSION" ]]; then
    VERSION=$(echo "$EXE_BASENAME" | sed -nE "s/^${APP_NAME}-(.+)-win\.exe$/\1/p")
  fi
  PLATFORM="win"
else
  if [[ ! -d "$SOURCE_PATH" || "${SOURCE_PATH##*.}" != "app" ]]; then
    echo "Expected a .app directory, .zip, or .exe file, got: $SOURCE_PATH" >&2
    exit 1
  fi
  SOURCE_APP="$SOURCE_PATH"
  VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$SOURCE_APP/Contents/Info.plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$SOURCE_APP/Contents/Info.plist" 2>/dev/null)
  PLATFORM="mac"
fi

if [[ -z "$VERSION" ]]; then
  echo "Could not determine version" >&2
  exit 1
fi

echo "Detected version: $VERSION (platform: $PLATFORM)"

if [[ "$PLATFORM" == "win" ]]; then
  ARTIFACT="$UPDATE_DIR/${APP_NAME}-${VERSION}-win.exe"
else
  ARTIFACT="$UPDATE_DIR/${APP_NAME}-${VERSION}-mac.zip"
fi

if [[ -n "$SOURCE_ZIP" || -n "$SOURCE_EXE" ]]; then
  SOURCE_FILE="${SOURCE_ZIP:-$SOURCE_EXE}"
  RESOLVED_SOURCE="$(realpath "$SOURCE_FILE" 2>/dev/null || echo "$SOURCE_FILE")"
  RESOLVED_ARTIFACT="$(realpath "$ARTIFACT" 2>/dev/null || echo "$ARTIFACT")"
  if [[ "$RESOLVED_SOURCE" != "$RESOLVED_ARTIFACT" ]]; then
    cp "$SOURCE_FILE" "$ARTIFACT"
  fi
else
  rm -f "$ARTIFACT"
  if command -v ditto >/dev/null 2>&1; then
    ditto -c -k --sequesterRsrc --keepParent "$SOURCE_APP" "$ARTIFACT"
  else
    (cd "$(dirname "$SOURCE_APP")" && zip -r "$ARTIFACT" "$(basename "$SOURCE_APP")")
  fi
fi

SHA512=$(shasum -a 512 "$ARTIFACT" | awk '{print $1}' | xxd -r -p | base64 | tr -d '\n')
SIZE=$(stat -f%z "$ARTIFACT" 2>/dev/null || stat -c%s "$ARTIFACT")
RELEASE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

ARTIFACT_NAME="$(basename "$ARTIFACT")"

YML_CONTENT="version: \"${VERSION}\"
files:
  - url: \"${ARTIFACT_NAME}\"
    sha512: \"${SHA512}\"
    size: ${SIZE}
path: \"${ARTIFACT_NAME}\"
sha512: \"${SHA512}\"
releaseDate: \"${RELEASE_DATE}\""

YML_SUFFIX=""
if [[ "$PLATFORM" == "mac" ]]; then
  YML_SUFFIX="-mac"
fi

if [[ "$VERSION" =~ -(beta|alpha|rc|canary|insider|next|experimental)\. ]]; then
  PRERELEASE_CHANNEL=$(echo "$VERSION" | sed -nE 's/.*-([a-z]+)\..*/\1/p')
  YML_FILE="$UPDATE_DIR/${PRERELEASE_CHANNEL}${YML_SUFFIX}.yml"
  echo "$YML_CONTENT" > "$YML_FILE"
  echo "Generated ${PRERELEASE_CHANNEL}${YML_SUFFIX}.yml (stable channel untouched)"
else
  YML_FILE="$UPDATE_DIR/latest${YML_SUFFIX}.yml"
  echo "$YML_CONTENT" > "$YML_FILE"
  echo "Generated latest${YML_SUFFIX}.yml"
fi

echo "=== Local Update Files ==="
echo "Directory: $UPDATE_DIR"
echo "Artifact:  $ARTIFACT ($SIZE bytes)"
echo "Yml:       $YML_FILE"
echo ""
cat "$YML_FILE"
echo ""
echo "Done. Run '$SCRIPT_DIR/serve-local-update.sh' to start the update server."
