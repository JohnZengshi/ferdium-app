#!/bin/bash

# AITALK DMG 打包脚本 (无沙盒限制版本)
# 用途：构建可访问系统文件的 DMG 安装包供内部测试使用
# 输出：out/AITALK-darwin-{version}-{arch}.dmg
#
# 使用方法:
#   ./scripts/build-dmg-no-sandbox.sh [mac-uni|mac-sep]
#
# 参数说明:
#   mac-uni  - 生成单个 Universal 通用包 (x64 + arm64 合并，体积较大)
#   mac-sep  - 生成两个独立安装包 (x64 和 arm64 分开，默认)
#   无参数   - 自动检测当前架构，仅构建当前平台版本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 解析参数
BUILD_MODE="${1:-auto}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AITALK DMG 打包 (无沙盒限制版本)${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示打包模式
case "$BUILD_MODE" in
    mac-uni)
        echo -e "${BLUE}打包模式: Universal (x64 + arm64 合并)${NC}"
        ;;
    mac-sep)
        echo -e "${BLUE}打包模式: Separate (x64 和 arm64 分开)${NC}"
        ;;
    auto)
        echo -e "${BLUE}打包模式: Auto (仅当前架构)${NC}"
        ;;
    *)
        echo -e "${RED}错误: 无效的参数 '$BUILD_MODE'${NC}"
        echo -e "${YELLOW}使用方法: $0 [mac-uni|mac-sep]${NC}"
        echo -e "  mac-uni  - 生成单个 Universal 通用包"
        echo -e "  mac-sep  - 生成两个独立安装包"
        exit 1
        ;;
esac

# 检查是否在项目根目录
if [ ! -f "package.json" ] || [ ! -f "electron-builder.yml" ]; then
    echo -e "${RED}错误: 请在 ferdium-app 项目根目录执行此脚本${NC}"
    exit 1
fi

# 检查并切换到正确的 Node.js 版本
REQUIRED_NODE_VERSION="22.18.0"

# 尝试加载 nvm
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    echo -e "${YELLOW}尝试切换到 Node.js ${REQUIRED_NODE_VERSION}...${NC}"
    nvm use ${REQUIRED_NODE_VERSION} 2>/dev/null || {
        echo -e "${YELLOW}未找到 Node.js ${REQUIRED_NODE_VERSION}，尝试安装...${NC}"
        nvm install ${REQUIRED_NODE_VERSION}
        nvm use ${REQUIRED_NODE_VERSION}
    }
fi

# 验证 Node.js
CURRENT_NODE_VERSION=$(node --version | sed 's/v//')
if [ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
    echo -e "${YELLOW}警告: Node 版本不匹配 (需要: ${REQUIRED_NODE_VERSION}, 当前: ${CURRENT_NODE_VERSION})${NC}"
    echo -e "${YELLOW}继续构建，但可能遇到兼容性问题...${NC}"
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: 未找到 pnpm，请先安装 pnpm 10.14.0${NC}"
    exit 1
fi

echo -e "${YELLOW}✓ Node 版本: $(node --version)${NC}"
echo -e "${YELLOW}✓ pnpm 版本: $(pnpm --version)${NC}"

# 1. 备份原始 entitlements 文件
echo -e "\n${GREEN}[1/6] 备份原始 entitlements 配置...${NC}"
cp build-helpers/entitlements.mas.plist build-helpers/entitlements.mas.plist.bak
cp build-helpers/entitlements.mas.inherit.plist build-helpers/entitlements.mas.inherit.plist.bak
echo -e "${GREEN}✓ 已备份 entitlements 文件${NC}"

# 2. 创建无沙盒限制的 entitlements 文件
echo -e "\n${GREEN}[2/6] 生成无沙盒限制的 entitlements 配置...${NC}"

cat > build-helpers/entitlements.mas.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- 禁用 App Sandbox 以允许访问系统文件 -->
    <key>com.apple.security.app-sandbox</key>
    <false/>
    
    <!-- JIT 编译支持 (Electron/V8 需要) -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    
    <!-- 允许未签名的可执行内存 (Electron 需要) -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    
    <!-- 禁用库验证 (允许加载第三方库) -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    
    <!-- 摄像头访问 -->
    <key>com.apple.security.device.camera</key>
    <true/>
    
    <!-- 麦克风访问 -->
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    
    <!-- 网络访问 -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    
    <!-- Apple Events 自动化 -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    
    <!-- 文件系统访问 (无沙盒限制的关键配置) -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    
    <!-- 打印支持 -->
    <key>com.apple.security.print</key>
    <true/>
  </dict>
</plist>
EOF

cat > build-helpers/entitlements.mas.inherit.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- 禁用 App Sandbox (子进程继承) -->
    <key>com.apple.security.app-sandbox</key>
    <false/>
    
    <!-- JIT 编译支持 -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    
    <!-- 允许未签名的可执行内存 -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    
    <!-- 禁用库验证 -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    
    <!-- 摄像头访问 -->
    <key>com.apple.security.device.camera</key>
    <true/>
    
    <!-- 麦克风访问 -->
    <key>com.apple.security.device.microphone</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    
    <!-- 网络访问 -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    
    <!-- Apple Events 自动化 -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>
  </dict>
</plist>
EOF

echo -e "${GREEN}✓ 已生成无沙盒 entitlements 配置${NC}"

# 3. 清理旧的构建产物
echo -e "\n${GREEN}[3/6] 清理旧的构建产物...${NC}"
rm -rf build out
echo -e "${GREEN}✓ 清理完成${NC}"

# 4. 安装依赖 (如果需要)
if [ ! -d "node_modules" ]; then
    echo -e "\n${GREEN}[4/6] 安装依赖...${NC}"
    pnpm install
else
    echo -e "\n${GREEN}[4/6] 依赖已存在，跳过安装${NC}"
fi

# 5. 构建应用代码
echo -e "\n${GREEN}[5/6] 构建应用代码...${NC}"
pnpm run build

# 6. 打包 DMG (仅 macOS)
echo -e "\n${GREEN}[6/6] 打包 DMG 镜像...${NC}"

# 获取构建号 (HEAD 提交总数)
BUILD_NUMBER=$(git rev-list --count HEAD)
export BUILD_NUMBER
echo -e "${YELLOW}✓ 构建号: ${BUILD_NUMBER}${NC}"

# 根据打包模式决定架构参数
case "$BUILD_MODE" in
    mac-uni)
        echo -e "${YELLOW}构建 Universal 通用包 (x64 + arm64)...${NC}"
        ARCH_ARG="--universal"
        ;;
    mac-sep)
        echo -e "${YELLOW}构建独立双架构包 (x64 和 arm64)...${NC}"
        ARCH_ARG="--x64 --arm64"
        ;;
    auto)
        # 检测当前架构
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            echo -e "${YELLOW}检测到 Apple Silicon (ARM64)，仅构建 arm64 版本${NC}"
            ARCH_ARG="--arm64"
        else
            echo -e "${YELLOW}检测到 Intel (x64)，仅构建 x64 版本${NC}"
            ARCH_ARG="--x64"
        fi
        ;;
esac

# 恢复原始 entitlements 文件
cleanup() {
    echo -e "\n${YELLOW}恢复原始 entitlements 配置...${NC}"
    if [ -f build-helpers/entitlements.mas.plist.bak ]; then
        mv build-helpers/entitlements.mas.plist.bak build-helpers/entitlements.mas.plist
    fi
    if [ -f build-helpers/entitlements.mas.inherit.plist.bak ]; then
        mv build-helpers/entitlements.mas.inherit.plist.bak build-helpers/entitlements.mas.inherit.plist
    fi
}

# 设置 trap 在脚本退出时恢复原始文件
trap cleanup EXIT

# 执行打包 (仅 DMG 目标，跳过 notarization)
echo -e "${YELLOW}执行 electron-builder...${NC}"
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder --mac dmg $ARCH_ARG --config.mac.notarize=false --publish never

for DMG_FILE in out/*.dmg; do
    [ -f "$DMG_FILE" ] || continue
    BASENAME=$(basename "$DMG_FILE")
    NAME="${BASENAME%.*}"
    NEW_NAME="${NAME}-${BUILD_NUMBER}.dmg"
    mv "$DMG_FILE" "out/$NEW_NAME"
    echo -e "${GREEN}✓ 已重命名文件为: $NEW_NAME${NC}"
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示输出文件
echo -e "\n${YELLOW}输出文件位置:${NC}"
if ls out/*.dmg 1> /dev/null 2>&1; then
    ls -lh out/*.dmg
    echo ""
    echo -e "${GREEN}共生成 $(ls out/*.dmg | wc -l | xargs) 个 DMG 文件 (构建号: ${BUILD_NUMBER})${NC}"
else
    echo -e "${RED}未找到 DMG 文件${NC}"
fi

echo -e "\n${YELLOW}使用说明:${NC}"
echo -e "1. 将 DMG 文件分发给测试人员"
echo -e "2. 测试人员双击 DMG 文件挂载磁盘镜像"
echo -e "3. 将 AITALK.app 拖到 Applications 文件夹"
echo -e "4. 首次运行时，如果系统提示无法打开，请执行:"
echo -e "   ${GREEN}sudo xattr -cr /Applications/AITALK.app${NC}"
echo -e "   ${GREEN}sudo spctl --master-disable${NC} (临时禁用 Gatekeeper)"
echo -e "   或者: 系统偏好设置 → 隐私与安全性 → 点击 '仍要打开'"
echo -e ""
echo -e "${YELLOW}架构说明:${NC}"
echo -e "  • Universal (mac-uni): 单个包支持 Intel 和 Apple Silicon，体积约 2 倍"
echo -e "  • Separate (mac-sep): 两个独立包，用户根据自己的芯片下载对应版本"
echo -e "  • x64: Intel 芯片 Mac"
echo -e "  • arm64: Apple Silicon (M1/M2/M3) Mac"
echo -e ""
echo -e "${YELLOW}注意: 此版本没有沙盒限制，仅供内部测试使用！${NC}"
