#!/bin/bash

# AITALK DMG 快速验证脚本
# 用途: 验证打包的 DMG 文件可以正常挂载和安装

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AITALK DMG 验证脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 查找 DMG 文件
DMG_FILE=$(ls out/*.dmg 2>/dev/null | head -1)

if [ -z "$DMG_FILE" ]; then
    echo -e "${RED}错误: 未找到 DMG 文件${NC}"
    exit 1
fi

echo -e "\n${YELLOW}找到 DMG 文件:${NC} $DMG_FILE"
echo -e "${YELLOW}文件大小:${NC} $(du -h "$DMG_FILE" | cut -f1)"

# 挂载 DMG
echo -e "\n${GREEN}[1/4] 挂载 DMG...${NC}"
MOUNT_POINT=$(hdiutil attach "$DMG_FILE" | grep Volumes | cut -f 3)

if [ -z "$MOUNT_POINT" ]; then
    echo -e "${RED}错误: DMG 挂载失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ DMG 已挂载到: $MOUNT_POINT${NC}"

# 验证 app 文件存在
echo -e "\n${GREEN}[2/4] 验证应用文件...${NC}"
APP_PATH="$MOUNT_POINT/AITALK.app"

if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}错误: 未找到 AITALK.app${NC}"
    hdiutil detach "$MOUNT_POINT" -quiet
    exit 1
fi

echo -e "${GREEN}✓ 找到应用: $APP_PATH${NC}"

# 验证签名
echo -e "\n${GREEN}[3/4] 验证代码签名...${NC}"
codesign -dv "$APP_PATH" 2>&1 | grep -E "Identifier|Authority" || true

# 验证 entitlements
echo -e "\n${GREEN}[4/4] 验证权限配置...${NC}"

# 检查 app-sandbox 键值
if codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | grep -q "<key>com.apple.security.app-sandbox</key><false/>"; then
    echo -e "${GREEN}✓ 沙盒状态: 已禁用 (无沙盒限制)${NC}"
    echo -e "${GREEN}✓ 应用可以访问系统文件${NC}"
elif codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | grep -q "<key>com.apple.security.app-sandbox</key><true/>"; then
    echo -e "${RED}✗ 沙盒状态: 已启用 (标准限制)${NC}"
    echo -e "${RED}✗ 这不是无沙盒版本！${NC}"
    hdiutil detach "$MOUNT_POINT" -quiet
    exit 1
else
    echo -e "${YELLOW}⚠ 无法确定沙盒状态${NC}"
fi

# 卸载 DMG
echo -e "\n${YELLOW}卸载 DMG...${NC}"
hdiutil detach "$MOUNT_POINT" -quiet
echo -e "${GREEN}✓ DMG 已卸载${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 验证完成！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}下一步:${NC}"
echo -e "1. 双击 DMG 文件手动测试安装过程"
echo -e "2. 将 AITALK.app 拖到 Applications 文件夹"
echo -e "3. 首次运行时按照说明处理安全提示"
echo -e "4. 参考 out/测试验证清单.md 进行完整功能测试"
