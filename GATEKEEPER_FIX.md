# 🚨 Gatekeeper "恶意软件"提示 - 快速解决方案

## 问题描述

安装 Ferdium.app 后，macOS 提示：
```
已阻止恶意软件并移到废纸篓
未打开"Ferdium.app"，因其包含恶意软件。
```

**这不是真的恶意软件！** 这是因为应用没有经过 Apple 公证，Gatekeeper 默认阻止未公证的应用。

---

## ✅ 一键解决方案 (推荐)

### 步骤 1: 打开终端

- 按 `Cmd + Space` 搜索"终端"并打开
- 或者在 `应用程序 → 实用工具 → 终端.app` 中打开

### 步骤 2: 运行修复脚本

复制以下命令，粘贴到终端，按回车：

```bash
cd ~/Documents/LZXL/ais/ferdium-app && ./scripts/fix-gatekeeper.sh
```

脚本会提示输入管理员密码（输入时不显示字符，这是正常的）。

### 步骤 3: 启动应用

修复完成后，从启动台或 Applications 文件夹启动 Ferdium。

---

## 🔧 手动解决方案

如果自动脚本不可用，可以手动执行以下步骤：

### 1. 从废纸篓恢复应用

打开终端，运行：
```bash
mv ~/.Trash/Ferdium.app /Applications/
```

### 2. 移除隔离属性

```bash
sudo xattr -cr /Applications/Ferdium.app
```

输入管理员密码（输入时不显示，这是正常的）。

### 3. 重置 Gatekeeper 记录

```bash
sudo spctl --add /Applications/Ferdium.app
```

### 4. 启动应用

```bash
open /Applications/Ferdium.app
```

或从启动台/Applications 文件夹手动打开。

---

## 🛡️ 为什么会出现这个提示？

macOS Gatekeeper 是苹果的安全机制，它会检查应用是否：
1. ✅ **代码签名** - Ferdium 有 (Apple Development 签名)
2. ❌ **公证 (Notarization)** - Ferdium 没有 (需要 $99/年的开发者账号)

没有公证的应用，macOS 会标记为"恶意软件"并自动移到废纸篓。

**我们的应用是安全的**，只是跳过了公证步骤 (因为这是内部测试版本)。

---

## ❓ 常见问题

### Q: 这个脚本安全吗？

是的。脚本只做三件事：
1. 从废纸篓恢复应用
2. 移除隔离标记 (`xattr -cr`)
3. 告知 Gatekeeper 信任此应用 (`spctl --add`)

你可以打开 `scripts/fix-gatekeeper.sh` 查看完整代码。

### Q: 为什么需要 sudo 密码？

修改系统安全设置需要管理员权限。输入密码时光标不会移动，这是 macOS 的安全特性。

### Q: 修复后还会再次被阻止吗？

不会。修复后，Gatekeeper 会记住这个应用是可信的。

### Q: 能否避免这个问题？

完全避免的唯一方法是：
1. 加入 Apple Developer Program ($99/年)
2. 对应用进行公证 (notarize)

对于内部测试版本，使用修复脚本是更实际的方案。

---

## 📞 仍然遇到问题？

如果修复脚本无法解决问题，尝试：

1. **检查应用是否在 Applications 文件夹**
   ```bash
   ls -l /Applications/Ferdium.app
   ```

2. **查看详细错误**
   从终端启动查看具体错误信息：
   ```bash
   /Applications/Ferdium.app/Contents/MacOS/Ferdium
   ```

3. **完全重置**
   ```bash
   # 删除应用
   rm -rf /Applications/Ferdium.app
   rm -rf ~/.Trash/Ferdium.app
   
   # 重新安装 DMG
   open ~/Documents/LZXL/ais/ferdium-app/out/Ferdium-mac-7.1.3-nightly.3-x64.dmg
   
   # 安装后立即运行修复脚本
   cd ~/Documents/LZXL/ais/ferdium-app
   ./scripts/fix-gatekeeper.sh
   ```

---

## 📚 相关文档

- **完整技术文档**: `scripts/BUILD_DMG_README.md`
- **交付说明**: `out/交付说明.md`
- **测试清单**: `out/测试验证清单.md`

---

**💡 提示**: 将这个文档分享给其他测试人员，帮助他们快速解决同样的问题。
