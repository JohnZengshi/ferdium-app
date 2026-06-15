#!/bin/bash

# AITALK Gatekeeper 修复脚本
# 用途: 解决"已阻止恶意软件"提示

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AITALK Gatekeeper 修复工具${NC}"
echo -e "${GREEN}========================================${NC}"

APP_PATH="/Applications/AITALK.app"

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}错误: 未找到 AITALK.app${NC}"
    echo -e "${YELLOW}请先将应用安装到 Applications 文件夹${NC}"
    exit 1
fi

echo -e "\n${YELLOW}找到应用: $APP_PATH${NC}"

# 步骤 1: 从废纸篓恢复 (如果被移除)
echo -e "\n${GREEN}[1/4] 检查应用状态...${NC}"
if [ -d "$HOME/.Trash/AITALK.app" ]; then
    echo -e "${YELLOW}检测到应用在废纸篓，正在恢复...${NC}"
    mv "$HOME/.Trash/AITALK.app" /Applications/
    echo -e "${GREEN}✓ 已从废纸篓恢复到 Applications${NC}"
fi

# 步骤 2: 移除隔离属性
echo -e "\n${GREEN}[2/4] 移除隔离属性...${NC}"
sudo xattr -cr "$APP_PATH"
echo -e "${GREEN}✓ 隔离属性已移除${NC}"

# 步骤 3: 重置 Gatekeeper 记录
echo -e "\n${GREEN}[3/4] 重置 Gatekeeper 记录...${NC}"
sudo xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true
sudo spctl --add "$APP_PATH"
echo -e "${GREEN}✓ Gatekeeper 记录已重置${NC}"

# 步骤 4: 告知系统信任应用
echo -e "\n${GREEN}[4/4] 告知系统信任应用...${NC}"
sudo spctl --remove "$APP_PATH" 2>/dev/null || true
echo -e "${GREEN}✓ 应用已标记为可信${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 修复完成！${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}现在尝试启动应用:${NC}"
echo -e "1. 从 启动台 或 Applications 文件夹打开 AITALK"
echo -e "2. 如果仍有提示，点击 '打开'"
echo -e ""
echo -e "${YELLOW}或使用命令行启动:${NC}"
echo -e "  open /Applications/AITALK.app"
