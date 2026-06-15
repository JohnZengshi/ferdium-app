# AITALK 品牌更名 - 变更总结

## 已完成的修改

### 1. 核心配置文件

**package.json**:
- `name`: `ferdium` → `aitalk`
- `productName`: `Ferdium` → `AITALK`
- `appId`: `org.ferdium.ferdium-app` → `com.lzxl.aitalk`
- `desktopName`: `ferdium.desktop` → `aitalk.desktop`
- `description`: 更新为 "AITALK - AI-powered messaging platform"
- `author`: `Ferdium Contributors` → `LZXL Team`
- `copyright`: `org.ferdium` → `LZXL`

**electron-builder.yml**:
- `appId`: `org.ferdium.ferdium-app` → `com.lzxl.aitalk`
- `protocols.name`: `Ferdium` → `AITALK`
- `protocols.schemes`: `[ferdium]` → `[aitalk]`
- `portable.unpackDirName`: `Ferdium-Unpacked` → `AITALK-Unpacked`
- `linux.executableName`: `ferdium` → `aitalk`
- 所有描述文本更新为 AITALK

### 2. 脚本文件

**build-dmg-no-sandbox.sh**:
- 标题和注释中的 Ferdium → AITALK
- 输出文件说明更新

**verify-dmg.sh**:
- 所有 Ferdium.app 引用 → AITALK.app
- 挂载点路径自动适配

**fix-gatekeeper.sh**:
- 应用路径: `/Applications/Ferdium.app` → `/Applications/AITALK.app`
- 废纸篓路径相应更新
- 所有提示文本更新

### 3. 品牌配置文件

创建 `.brand.config` 文件，集中管理品牌信息：
```bash
APP_NAME="AITALK"
APP_ID="com.lzxl.aitalk"
APP_DESCRIPTION="AITALK - AI-powered messaging platform"
APP_AUTHOR="LZXL Team"
```

## 输出文件命名

### macOS
- DMG: `AITALK-mac-7.1.3-nightly.3-x64.dmg`
- ZIP: `AITALK-mac-bundle-7.1.3-nightly.3-x64.zip`
- 应用名: `AITALK.app`

### Windows
- Installer: `AITALK-win-AutoSetup-7.1.3-nightly.3-x64.exe`
- Portable: `AITALK-win-Portable-7.1.3-nightly.3-x64.exe`

### Linux
- AppImage: `AITALK-linux-Portable-7.1.3-nightly.3-x64.AppImage`
- DEB: `AITALK-linux-7.1.3-nightly.3-x64.deb`
- RPM: `AITALK-linux-7.1.3-nightly.3-x64.rpm`
- 可执行文件: `aitalk`
- Desktop 文件: `aitalk.desktop`

## 验证结果

```bash
$ ./scripts/verify-dmg.sh

找到 DMG 文件: out/AITALK-mac-7.1.3-nightly.3-x64.dmg
✓ DMG 已挂载到: /Volumes/AITALK 7.1.3-nightly.3
✓ 找到应用: /Volumes/AITALK 7.1.3-nightly.3/AITALK.app
✓ Identifier=com.lzxl.aitalk
✓ 沙盒状态: 已禁用 (无沙盒限制)
```

## 系统集成

### 协议处理
- 自定义协议: `aitalk://`
- 示例: `aitalk://open-chat/123`

### Linux 集成
- Desktop Entry: `aitalk.desktop`
- 可执行文件: `/usr/bin/aitalk` 或 `/opt/AITALK/aitalk`
- 分类: Network;InstantMessaging;

### macOS 集成
- Bundle ID: `com.lzxl.aitalk`
- 应用名称: `AITALK.app`
- 位置: `/Applications/AITALK.app`

## 后续操作

### 如需进一步自定义

1. **修改版本号**:
   编辑 `package.json` 中的 `version` 字段

2. **修改应用图标**:
   - macOS: `build-helpers/images/icon.icns`
   - Windows: `build-helpers/images/icon.ico`
   - Linux: `build-helpers/images/icons/`

3. **修改 DMG 背景图**:
   - 文件: `build-helpers/images/dmgInstaller.tiff`

4. **修改描述和元数据**:
   编辑 `package.json` 和 `electron-builder.yml`

### 重新打包

```bash
cd ~/Documents/LZXL/ais/ferdium-app

# 方式 1: 使用无沙盒脚本
./scripts/build-dmg-no-sandbox.sh

# 方式 2: 标准构建
pnpm run build
```

### 验证打包结果

```bash
./scripts/verify-dmg.sh
```

## 注意事项

### 已更新的文件

- ✅ `package.json` - 核心元数据
- ✅ `electron-builder.yml` - 构建配置
- ✅ `.brand.config` - 品牌配置（新增）
- ✅ `scripts/build-dmg-no-sandbox.sh` - 打包脚本
- ✅ `scripts/verify-dmg.sh` - 验证脚本
- ✅ `scripts/fix-gatekeeper.sh` - 修复脚本

### 未修改的文件

以下文件保持原样（不影响打包）：
- 源代码中的类名、函数名等
- 内部日志和调试信息
- Git 仓库 URL
- 文档中的历史说明

### 需要手动更新的文档

如需彻底更名，建议更新：
- README.md
- LICENSE
- CHANGELOG.md
- 其他文档中的 Ferdium 引用

## 变量化配置（未来改进）

建议创建统一的配置管理：

```javascript
// brand.config.js
module.exports = {
  name: 'AITALK',
  appId: 'com.lzxl.aitalk',
  author: 'LZXL Team',
  copyright: 'LZXL',
  description: 'AITALK - AI-powered messaging platform',
  protocol: 'aitalk',
  // ...
};
```

然后在 electron-builder 配置中引用：

```javascript
const brand = require('./brand.config');

module.exports = {
  appId: brand.appId,
  productName: brand.name,
  // ...
};
```

---

**更新日期**: 2026-06-15  
**状态**: ✅ 完成并已验证  
**输出**: `out/AITALK-mac-7.1.3-nightly.3-x64.dmg` (183 MB)
