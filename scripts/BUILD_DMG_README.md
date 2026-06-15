# Ferdium DMG 打包说明 (无沙盒限制版本)

## 快速开始

### 1. 执行打包脚本

```bash
cd ~/Documents/LZXL/ais/ferdium-app
./scripts/build-dmg-no-sandbox.sh
```

脚本会自动：
- ✅ 备份原始 entitlements 配置
- ✅ 生成无沙盒限制的权限配置
- ✅ 清理旧的构建产物
- ✅ 构建应用代码
- ✅ 打包 DMG 镜像
- ✅ 恢复原始配置

### 2. 获取打包产物

打包完成后，DMG 文件位于：

```
out/Ferdium-darwin-{version}-{arch}.dmg
```

例如：`out/Ferdium-darwin-7.1.3-nightly.3-arm64.dmg`

---

## 分发和安装指南

### 给测试人员的安装说明

1. **挂载 DMG 文件**
   - 双击 `Ferdium-darwin-*.dmg` 文件
   - 系统会自动挂载磁盘镜像并打开安装窗口

2. **安装应用**
   - 将 `Ferdium.app` 拖到 `Applications` 文件夹图标上
   - 等待复制完成

3. **首次运行**
   - 打开 `启动台` 或 `Applications` 文件夹
   - 找到并点击 `Ferdium` 图标

4. **处理安全提示**

   如果系统提示"无法打开 Ferdium.app，因为无法验证开发者"：

   **方法一：通过系统偏好设置允许 (推荐)**
   ```
   1. 打开 "系统偏好设置" → "隐私与安全性"
   2. 在页面底部找到被阻止的应用提示
   3. 点击 "仍要打开" 按钮
   4. 再次点击 "打开" 确认
   ```

   **方法二：通过终端移除隔离属性**
   ```bash
   sudo xattr -cr /Applications/Ferdium.app
   ```

   **方法三：临时禁用 Gatekeeper (不推荐)**
   ```bash
   # 禁用 Gatekeeper
   sudo spctl --master-disable
   
   # 使用完后记得重新启用
   sudo spctl --master-enable
   ```

---

## 技术细节

### 与标准版本的区别

| 特性 | 标准版本 | 无沙盒版本 (此脚本) |
|------|----------|---------------------|
| App Sandbox | ✅ 启用 | ❌ 禁用 |
| 文件系统访问 | 🔒 受限 | ✅ 完全访问 |
| 代码签名 | ✅ 已签名 | ❌ 自签名/未签名 |
| 公证 (Notarization) | ✅ 已公证 | ❌ 跳过 |
| 适用场景 | 公开发布 | 内部测试 |

### 权限配置清单

此版本包含以下权限：

- ✅ **无沙盒限制** (`com.apple.security.app-sandbox: false`)
- ✅ **文件系统读写** (用户选择、下载目录)
- ✅ **网络访问** (客户端和服务器)
- ✅ **摄像头和麦克风** (视频/音频通话)
- ✅ **JIT 编译** (Electron/V8 引擎需要)
- ✅ **Apple Events 自动化**
- ✅ **打印功能**

### 为什么需要禁用沙盒？

macOS App Sandbox 默认限制应用访问：
- 用户目录之外的文件系统
- 特定系统 API 和资源
- 某些进程间通信

禁用沙盒后，应用可以：
- 访问系统文件 (如 `/usr/local/bin`、`/opt` 等)
- 读写任意用户指定的文件路径
- 与其他应用进行更深度集成

⚠️ **安全提示**: 此版本仅供受信任的内部测试人员使用，不应公开分发。

---

## 故障排查

### 问题 1: "无法打开 Ferdium.app，因为它来自身份不明的开发者"

**原因**: 应用未经过 Apple 公证

**解决方案**: 按照上面的"处理安全提示"步骤操作

---

### 问题 2: 运行脚本时报错 "command not found: pnpm"

**原因**: 未安装 pnpm

**解决方案**:
```bash
npm install -g pnpm@10.14.0
```

---

### 问题 3: 打包过程中提示 "ENOENT: no such file or directory"

**原因**: 缺少必要的构建文件

**解决方案**:
```bash
# 重新安装依赖
pnpm install

# 确保子模块已初始化
pnpm run git:submodules
pnpm run setup:recipes
```

---

### 问题 4: DMG 文件生成但应用无法启动

**原因**: 可能缺少运行时依赖

**解决方案**:
1. 检查控制台日志：`/Applications/Utilities/Console.app`
2. 查看应用崩溃报告：`~/Library/Logs/DiagnosticReports/`
3. 尝试从终端启动查看详细错误：
   ```bash
   /Applications/Ferdium.app/Contents/MacOS/Ferdium
   ```

---

## 自动化集成

### 添加到 package.json

如果需要频繁打包，可以将脚本添加到 `package.json`:

```json
{
  "scripts": {
    "build:dmg:no-sandbox": "./scripts/build-dmg-no-sandbox.sh"
  }
}
```

然后通过以下命令调用：

```bash
pnpm run build:dmg:no-sandbox
```

---

## 注意事项

1. **仅供内部使用**: 此版本没有沙盒保护，不应发布到 App Store 或公开分发
2. **安全风险**: 禁用沙盒意味着应用可以访问更多系统资源，确保代码可信
3. **测试覆盖**: 在分发前充分测试文件系统访问功能
4. **备份原始配置**: 脚本会自动备份和恢复 entitlements 文件，避免影响标准构建流程

---

## 相关命令参考

```bash
# 查看应用签名信息
codesign -dv --verbose=4 /Applications/Ferdium.app

# 查看应用权限配置
codesign -d --entitlements :- /Applications/Ferdium.app

# 检查应用是否通过 Gatekeeper
spctl -a -v /Applications/Ferdium.app

# 手动移除隔离属性
xattr -d com.apple.quarantine /Applications/Ferdium.app

# 递归移除所有扩展属性
sudo xattr -cr /Applications/Ferdium.app
```

---

## 技术支持

如有问题，请检查：
1. 构建日志 (脚本输出)
2. Electron Builder 文档: https://www.electron.build/
3. macOS 代码签名指南: https://developer.apple.com/documentation/security/
