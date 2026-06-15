#!/bin/bash

# AITALK DMG 打包脚本 (无沙盒限制版本)
# 用途：构建可访问系统文件的 DMG 安装包供内部测试使用
# 输出：out/AITALK-darwin-{version}-{arch}.dmg

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AITALK DMG 打包 (无沙盒限制版本)${NC}"
echo -e "${GREEN}========================================${NC}"

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
echo -e "\n${GREEN}[6/6] 打包 DMG 镜像 (仅当前架构)...${NC}"

# 检测当前架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    echo -e "${YELLOW}检测到 Apple Silicon (ARM64)，仅构建 arm64 版本${NC}"
    ARCH_ARG="--arm64"
else
    echo -e "${YELLOW}检测到 Intel (x64)，仅构建 x64 版本${NC}"
    ARCH_ARG="--x64"
fi

# 恢复原始 entitlements 文件
cleanup() {
    echo -e "\n${YELLOW}恢复原始 entitlements 配置...${NC}"
    mv build-helpers/entitlements.mas.plist.bak build-helpers/entitlements.mas.plist
    mv build-helpers/entitlements.mas.inherit.plist.bak build-helpers/entitlements.mas.inherit.plist
}

# 设置 trap 在脚本退出时恢复原始文件
trap cleanup EXIT

# 执行打包 (仅 DMG 目标，跳过 notarization，仅当前架构)
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder --mac dmg $ARCH_ARG --config.mac.notarize=false

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示输出文件
echo -e "\n${YELLOW}输出文件位置:${NC}"
ls -lh out/*.dmg 2>/dev/null || echo -e "${RED}未找到 DMG 文件${NC}"

echo -e "\n${YELLOW}使用说明:${NC}"
echo -e "1. 将 DMG 文件分发给测试人员"
echo -e "2. 测试人员双击 DMG 文件挂载磁盘镜像"
echo -e "3. 将 Ferdium.app 拖到 Applications 文件夹"
echo -e "4. 首次运行时，如果系统提示无法打开，请执行:"
echo -e "   ${GREEN}sudo xattr -cr /Applications/Ferdium.app${NC}"
echo -e "   ${GREEN}sudo spctl --master-disable${NC} (临时禁用 Gatekeeper)"
echo -e "   或者: 系统偏好设置 → 隐私与安全性 → 点击 '仍要打开'"
echo -e ""
echo -e "${YELLOW}注意: 此版本没有沙盒限制，仅供内部测试使用！${NC}"
