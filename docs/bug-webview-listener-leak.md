# Bug: WebView did-stop-loading 监听器泄漏

## 状态
未修复

## 描述
`MaxListenersExceededWarning: 11 did-stop-loading listeners added to [WebContents]`

多个位置注册 `did-stop-loading` 监听器但未在 WebView 重 attach 时全部清理：

1. `src/models/Service.ts:1063` - `initializeWebViewEvents()` 中注册，无对应 removeEventListener
2. `src/components/services/content/ServiceWebview.tsx:280` - ref callback 中注册 `refocusWebview`，仅在 unmount 时清理
3. `src/components/services/content/ServiceWebview.tsx:147` - 性能埋点 `_attachMetricListeners` 中注册，attach/unmount 时配对清理 ✅

## 根因
Electron #31918 竞态导致 ref callback 多次触发，每次都 `addEventListener('did-stop-loading', ...)` 但只保留最后一个 webview 引用用于 removeEventListener，旧监听器泄漏。

## 影响范围
- 非性能模式也复现
- 不影响功能，仅产生 warning 和微量内存泄漏

## 修复方向
- 在 `_setWebviewReference` 中，如果 `service.webview !== null` 且与新 webview 不同，先移除旧 webview 上所有 Service 注册的监听器
- 或改用 `{ once: true }` / WeakMap 管理监听器生命周期

## 不要与性能埋点任务混合修复
