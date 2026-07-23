# 性能指标埋点 TODO List

## 目标

- [ ] 定位主进程、Renderer、Store、首屏启动瓶颈
- [ ] 区分 API、本地服务、Token 等待、网络、状态更新耗时
- [ ] 定位 Service WebView 挂载、加载、脚本注入瓶颈
- [ ] 发现长期运行后的 CPU、内存、监听器、WebView 泄漏

## 范围约束

- [x] 不引入 OpenTelemetry
- [x] 不给每个 React 组件埋点
- [x] 不记录每条 SQL
- [x] 不记录原始 URL、请求参数、响应、用户 ID、邮箱、服务 ID
- [x] 先采集数据，不顺带重构性能问题
- [x] 第一阶段只输出 Debug/JSONL，不接生产上传

## 指标模型与安全规则

### `src/performance/types.ts`

- [x] 新增 `PerformanceMetric` 类型
- [x] 定义单位：`ms`、`count`、`mb`、`percent`
- [x] 定义进程：`main`、`renderer`、`webview`、`server`
- [x] 定义指标名常量
- [x] 定义标签白名单
- [x] 校验指标名长度不超过 80 字符
- [x] 校验 `value` 有限且不小于 0
- [x] 限制每条指标最多 10 个标签
- [x] 限制字符串标签不超过 80 字符
- [x] 删除未知标签
- [x] 禁止 PII 标签

允许标签：

- [x] `status`
- [x] `store`
- [x] `method`
- [x] `backend`
- [x] `recipe_id`
- [x] `partition_type`
- [x] `cold_start`
- [x] `platform`
- [x] `arch`
- [x] `app_version`
- [x] `hardware_acceleration`
- [x] `service_count_bucket`
- [ ] `api_group`（仅固定枚举）

禁止采集：

- [x] `user_id`
- [x] `email`
- [x] `service_id`
- [x] `service_name`
- [x] 原始 URL
- [x] URL query
- [x] `Authorization`
- [x] Token
- [x] 请求参数和正文
- [x] 响应正文
- [x] 消息内容
- [ ] JID、peerId、requestId、手机号、会话 ID
- [x] 本地绝对路径

## 批次 1：采集基础设施

### `src/performance/main.ts`

- [x] 创建临时 session ID
- [x] 实现 `recordMetric()`
- [x] 实现 `flushMetrics()`
- [x] 注册 `performance:metric` IPC
- [x] 注册 `performance:flush` IPC
- [x] 建立最大 500 条内存队列
- [x] 队列满时丢弃最旧指标
- [x] 每 60 秒聚合并 flush
- [x] 应用退出前执行最终 flush
- [x] 使用 `Ferdium:Performance` Debug namespace
- [x] 支持 `--performance-metrics` 启用本地诊断
- [x] 支持可选 JSONL 输出
- [x] JSONL 异步写入，不阻塞应用
- [x] JSONL 最大 10 MB
- [x] JSONL 仅保留最近一个文件
- [x] 写入失败不得影响应用
- [x] 关闭采集时 `recordMetric()` 立即返回

### `src/performance/collector.ts`

> 批次 1 实施时新增的文件，从 `main.ts` 拆分出可测试的队列逻辑。

- [x] 实现 `MetricCollector` 类
- [x] 500 条内存队列上限
- [x] FIFO 驱逐（队列满时丢弃最旧）
- [x] `recordMetric()` 禁用时立即返回
- [x] 无效指标静默丢弃
- [x] 每 60 秒定时 flush
- [x] `enable()` / `disable()` 生命周期
- [x] `disable()` 时执行最终 flush
- [x] flush handler 异常不影响应用
- [x] 不依赖 Electron，可独立单元测试

### `src/performance/renderer.ts`

- [x] 实现 Renderer 指标发送接口
- [x] 使用 IPC 统一发送给 Main
- [x] 初始化 Paint observer
- [x] 初始化 Long Task observer
- [x] 每 60 秒聚合 Long Task
- [x] 接入 `Request.registerHook()`
- [x] 实现 Renderer event-loop lag 聚合
- [x] 禁用时不创建 observer、timer、IPC listener

### `test/performance/metrics.test.ts`

- [x] 非有限数值被拒绝
- [x] 负数被拒绝
- [x] 未知单位被拒绝
- [x] 未知标签被删除
- [x] 长字符串被截断
- [x] PII 标签被删除
- [x] 队列上限正确
- [x] flush 后队列清空
- [x] 禁用状态不产生输出

## 批次 2：启动链路

### `src/index.ts`

- [ ] 在主进程模块初始化顶部记录启动基准
- [ ] 测量同步临时目录处理耗时
- [ ] 记录 `startup.bootstrap_sync_io_ms`
- [ ] 在 `app.on('ready')` 记录 `startup.main_ready_ms`
- [ ] 测量 `createWindow()`
- [ ] 记录 `startup.window_create_ms`
- [ ] 在 `loadURL()` 前记录加载基准
- [ ] 监听 `webContents.dom-ready`
- [ ] 记录 `startup.renderer_dom_ready_ms`
- [ ] 在 `did-finish-load` 记录 `startup.renderer_loaded_ms`
- [ ] 监听 `render-process-gone`
- [ ] 记录 `renderer.crash_count`
- [ ] 监听 `child-process-gone`
- [ ] 记录 `process.crash_count`
- [ ] 在 `before-quit` flush
- [ ] 区分 cold start 与 warm window recreation

### `src/app.tsx`

- [ ] 记录 `renderer.window_load_ms`
- [ ] 记录 `renderer.api_factory_ms`
- [ ] 记录 `renderer.store_factory_ms`
- [ ] 记录 `renderer.menu_factory_ms`
- [ ] 记录 `renderer.touchbar_factory_ms`
- [ ] 使用 `PerformanceObserver` 记录 `renderer.first_paint_ms`
- [ ] 记录 `renderer.first_contentful_paint_ms`
- [ ] 使用一次性 `MutationObserver` 观察 `#root` 首次 DOM 变更
- [ ] 记录 `renderer.react_first_commit_ms`
- [ ] 首次提交后立即断开 `MutationObserver`
- [ ] 保持现有初始化顺序

### `src/stores/index.ts`

- [ ] 为每个 Store 构造过程计时
- [ ] 记录 `store.construct_ms`
- [ ] 为每个 Store `initialize()` 计时
- [ ] 记录 `store.initialize_ms`
- [ ] 初始化失败记录 `store.initialize_error`
- [ ] 标签只记录固定 Store 名称
- [ ] 不记录 Store 数据
- [ ] 保持 Store 构造顺序不变
- [ ] 保持 Store 初始化顺序不变
- [ ] 保持异常传播行为不变

## 批次 3：API 与本地服务

### `src/stores/lib/Request.ts`

- [x] 增加 `startedAt`
- [x] 增加 `durationMs`
- [x] API 调用前记录起点
- [x] 成功时计算耗时
- [x] 失败时计算耗时
- [x] 通过现有 Hook 记录 `api.request_ms`
- [x] 失败记录 `api.request_error`
- [x] 标签包含固定 `method`
- [ ] 标签包含 `backend=local|remote`
- [x] 标签包含 `status=ok|error`
- [x] 不记录 `callArgs`
- [x] 不记录 `error.message`
- [x] 不记录响应或完整 URL

### `src/stores/lib/CachedRequest.ts`

- [x] 复用 Request 计时字段
- [x] 缓存命中记录 `api.cache_hit`
- [x] inflight 跳过记录 `api.request_skipped_inflight`
- [x] 只有真实 API 调用记录 `api.request_ms`
- [x] 避免将缓存命中记录为 0ms API 请求
- [ ] 成功、失败 Hook 各只触发一次

### `src/electron/ipc-api/localServer.ts`

- [x] 记录 `local_server.port_scan_ms`
- [x] 记录 `local_server.port_scan_attempts`
- [x] 记录 `local_server.start_ms`
- [x] 启动失败记录 `local_server.start_error`
- [x] 计时覆盖收到启动事件到发送端口信息
- [x] 不记录 Profile 邮箱
- [x] 不记录 Token
- [x] 不记录数据库路径

### `src/internal-server/start.ts`

- [x] 记录 `local_server.profile_dir_ms`
- [x] 记录 `local_server.db_prepare_ms`
- [x] 记录 `local_server.adonis_boot_ms`
- [x] 避免性能采集模块形成循环依赖
- [x] 性能采集模块不得依赖 Internal Server、Settings、API

### Token 等待

- [x] 在 `prepareLocalToken()` 记录 `local_server.token_wait_ms`
- [x] 区分已有 Token、IPC 获取、MobX 等待、超时
- [x] 不记录 Token 内容

### `src/agent-flow-cs/api/customInstance.ts`

- [x] 在 Orval 中央请求实例统一埋点，不修改 generated API 文件
- [x] 记录 `agent_flow.request_ms`
- [x] 请求失败记录 `agent_flow.request_error`
- [x] 仅在可确认超时时记录 `agent_flow.request_timeout`
- [x] 记录并发请求数高水位 `agent_flow.pending_high_watermark`
- [x] 标签只包含固定 `method`、`status`、`api_group`
- [x] `api_group` 仅使用固定枚举：`auth|agent|conversation|rule|knowledge|digital_human|other`
- [x] URL 只用于本地固定规则分组，不写入指标、Debug、JSONL
- [x] 成功、HTTP 失败、网络失败、取消各只结束一次计时
- [x] 保持现有 Toast、401 登出、错误类型和 Promise 行为不变
- [x] 禁用性能采集时不创建额外计时器，不修改 Request 配置
- [x] 不新增重试；未来存在重试机制时再增加 retry 指标
- [x] 不记录 URL/query、请求参数、响应体、Token、用户/会话标识

### `src/agent-flow-cs/api/sse.ts`

- [x] 在现有 `subscribeSSE()` 中央入口统一埋点
- [x] 记录 `agent_flow.sse_connect_ms`
- [x] 连接成功记录 `agent_flow.sse_open_count`
- [x] 异常断开记录 `agent_flow.sse_error`
- [x] 主动关闭、服务端关闭、异常关闭记录 `agent_flow.sse_close_count`
- [x] 记录连接存活时间 `agent_flow.sse_uptime_ms`
- [x] 记录活跃连接数高水位 `agent_flow.sse_active_high_watermark`
- [x] close/error/finally 共享一次性结束逻辑，避免重复计数
- [x] 标签只包含固定 `status`、`api_group`
- [x] 不新增自动重连；未来实现重连时再增加 reconnect 指标
- [x] 不记录 SSE 数据、事件 ID、订阅路径、JID、customerId、waSessionId
- [x] 保持 `onEvent`、`onError`、`onClose` 调用顺序和次数不变

### `src/whatsapp-automation/api/customInstance.ts`

- [x] 在 Orval 中央请求实例统一埋点，不修改 generated API 文件
- [x] 记录 `whatsapp_automation.request_ms`
- [x] 请求失败记录 `whatsapp_automation.request_error`
- [x] 仅在可确认超时时记录 `whatsapp_automation.request_timeout`
- [x] 记录并发请求数高水位 `whatsapp_automation.pending_high_watermark`
- [x] 标签只包含固定 `method`、`status`、`api_group`
- [x] `api_group` 仅使用固定枚举：`auth|session|qr|status|control|other`
- [x] URL 只用于本地固定规则分组，不写入指标、Debug、JSONL
- [x] 成功、HTTP 失败、网络失败、取消各只结束一次计时
- [x] 保持现有响应解包、错误字段和 Promise 行为不变
- [x] 禁用性能采集时不创建额外计时器，不修改 Request 配置
- [x] 不新增重试；未来存在重试机制时再增加 retry 指标
- [x] 不记录 URL/query、请求参数、响应体、API Key、手机号、会话 ID

### Agent Flow / WhatsApp Automation 验收

- [x] 增加最小单元测试：成功、HTTP 失败、网络失败、取消各一条
- [x] 验证禁用模式不产生指标且原请求行为不变
- [ ] 验证 generated API 均通过各自 `useCustomInstance()` 自动覆盖
- [x] 验证 SSE 主动关闭、服务端关闭、异常关闭不重复计数
- [x] 验证指标与日志不包含敏感字段
- [x] 使用打包性能模式验证终端 Debug 与 JSONL 输出

## 批次 4：Service WebView

### `src/components/services/content/ServiceWebview.tsx`

- [x] 实例创建时记录 `createdAt`
- [x] `onDidAttach` 记录 `webview.attach_ms`
- [x] 监听 `dom-ready`
- [x] 记录 `webview.dom_ready_ms`
- [x] 监听 `did-stop-loading`
- [x] 记录 `webview.load_ms`
- [x] 卸载记录 `webview.unmount_count`
- [x] 标签只包含 `recipe_id`
- [x] 标签包含 `partition_type=general|sandbox`
- [x] 标签包含固定 `status`
- [x] 不使用 `service.id`
- [x] 不使用 `service.name`
- [x] 不使用 `service.url`
- [x] 不使用 `document.title`
- [x] 保存并清理所有新增监听器
- [x] 每个导航周期只记录一次
- [x] 兼容事件注册前已经完成加载的 WebView
- [x] `isLoading() === false` 时记录 `status=already_loaded`

### `src/stores/ServicesStore.ts`

- [x] 转发 WebView 性能指标（Service.ts 已处理）
- [x] 保持现有 WebView 引用和初始化行为
- [x] 不借埋点任务重构现有监听器生命周期
- [x] 为现有潜在监听器泄漏单独创建 Bug 任务（docs/bug-webview-listener-leak.md）

### `src/webview/lib/RecipeWebview.ts`

- [x] 测量 `injectJSUnsafe()` 批次总耗时
- [x] 记录 `webview.script_injection_batch_ms`
- [x] 记录 `webview.script_injection_count`
- [x] 记录 `webview.script_injection_error`
- [x] ACK 超时记录 `webview.script_ack_timeout`
- [x] 通过 `sendToHost('performance:metric')` 上报
- [x] 脚本名映射为固定分组
- [x] 支持 `recipe` 分组
- [x] 支持 `darkmode` 分组
- [x] 支持 `notifications` 分组
- [x] 支持 `automation` 分组
- [x] 未识别脚本归入 `other`
- [x] 不把任意脚本名用作标签

## 批次 4A：Recipe 通用性能桥接

### 目标

- [x] 打通 Recipe main world → preload → WebView host → Main collector 链路
- [x] WhatsApp、Telegram 指标统一汇总到 Main
- [x] 指标经 Main 的白名单校验、PII 过滤、队列和 JSONL 输出
- [x] 禁用性能模式时不创建 helper、observer、timer 或 IPC
- [x] Recipe 不直接连接上传端

### 文件

- [x] 新增 `recipes/shared/performance.js`
- [x] 修改 `src/webview/recipe.ts`，转发 `ferdium-performance-metric`
- [x] 修改 `src/models/Service.ts`，将 Recipe 指标转交 Main
- [x] 扩展 `src/performance/types.ts` 指标名和标签白名单
- [x] 新增 Recipe 性能桥接单元测试

### 通用指标

- [x] `recipe.bootstrap_ms`
- [x] `recipe.overlay_ready_ms`
- [x] `recipe.overlay_reinject_count`
- [x] `recipe.overlay_injection_error`
- [x] `recipe.overlay_timeout`
- [x] `recipe.destroy_ms`
- [x] `recipe.poll_count`
- [x] `recipe.poll_total_ms`
- [x] `recipe.poll_max_ms`
- [x] `recipe.mutation_callback_count`
- [x] `recipe.mutation_record_count`
- [x] `recipe.mutation_added_nodes`
- [x] `recipe.reconcile_count`
- [x] `recipe.reconcile_total_ms`
- [x] `recipe.reconcile_max_ms`
- [x] `recipe.reconcile_p95_ms`
- [x] `recipe.dom_nodes_scanned`
- [x] `recipe.interval_tick_count`
- [x] `recipe.api_request_ms`
- [x] `recipe.api_request_error`
- [x] `recipe.api_request_timeout`
- [x] `recipe.api_pending_count`
- [x] `recipe.translation_ms`
- [x] `recipe.translation_error`
- [x] `recipe.translation_cache_hit`

### Recipe 标签

- [x] `recipe_id=whatsapp|telegram`
- [x] `page_variant=web_a|web_k|web_z`
- [x] `trigger=poll|mutation|interval|navigation`
- [x] `visibility=visible|hidden`
- [x] `api_group=conversation|translation|suggestion|profile|other`
- [x] `status=ok|error|timeout|destroyed`
- [x] 禁止记录 Service ID、JID、peerId、requestId、消息文本、URL、API 参数

### 聚合与终端输出

- [x] Recipe 高频事件仅在 WebView 内做数字聚合
- [x] 每 60 秒最多向 Host flush 一次聚合指标
- [x] Main 通过 `Ferdium:Performance` 输出 Recipe 指标到启动终端
- [x] JSONL 同步写入相同 Recipe 指标
- [x] 终端格式示例：`Ferdium:Performance webview:recipe.reconcile_max_ms = 42ms {"recipe_id":"whatsapp"}`
- [x] 每个 WebView 每分钟发往 Host 的指标不超过 30 条

## 批次 4B：WhatsApp Recipe 性能监控

### `recipes/recipes/whatsapp/webview.js`

- [x] 记录 `whatsapp.badge_poll_ms`
- [x] 记录 `whatsapp.badge_rows_scanned`
- [x] 记录 `whatsapp.badge_poll_error`
- [x] 记录 `whatsapp.db_open_ms`
- [x] 记录 `whatsapp.db_reopen_count`
- [x] 区分 visible/hidden 状态
- [x] 验证隐藏 WebView 是否仍执行 IndexedDB `getAll()`

### Overlay 生命周期

- [x] 记录 `whatsapp.overlay_ready_ms`
- [x] 记录 `whatsapp.overlay_reinject_count`
- [x] 记录 `whatsapp.overlay_timeout`
- [x] 记录 Overlay destroy 耗时
- [x] BFCache pagehide/pageshow 分别记录 stop/reset/start

### Mutation 与 reconcile

- [x] 在 `_scheduleReconcile()` 统计 mutation 合并次数
- [x] 在 `waAI.reconcile()` 记录 count/total/max/p95
- [x] 在 `ensureBubbleEnhancements()` 记录待处理容器数量
- [x] 记录 `whatsapp.message_nodes_scanned`
- [x] 记录 `whatsapp.bubble_enhanced_count`
- [x] 记录 `whatsapp.reconcile_coalesced_count`
- [x] 埋点不得额外执行 `querySelectorAll`

### 周期任务与 API bridge

- [x] 记录 2 秒 `_nativeBindingInterval` tick 耗时
- [x] 记录 native binding/rebind 数量
- [x] 记录 API request 耗时、错误、超时
- [x] 记录 duplicate request dropped 数量
- [x] 记录 pending request 高水位
- [x] 不记录 API args、JID、conversation key、消息文本

### 泄漏验收

- [x] Overlay destroy 后 observer 数量为 0
- [x] Overlay destroy 后 interval/timeout/RAF 数量为 0
- [x] Overlay destroy 后 pending request 数量为 0
- [x] 连续切换聊天 20 次后 observer/timer/listener 不增长

## 批次 4C：Telegram Recipe 性能监控

### `recipes/recipes/telegram/webview.js`

- [x] 记录 `telegram.badge_scan_ms`
- [x] 记录 `telegram.chat_rows_scanned`
- [x] 记录 `telegram.badge_scan_count`
- [x] 记录 `telegram.badge_scan_error`
- [x] 标签区分 `web_a|web_k|web_z`
- [x] 标签区分 `poll|mutation`
- [x] 统计 chat-list MutationObserver callback/record 数量
- [x] 统计 300ms debounce 合并次数

### Overlay reconcile 与 debug

- [x] 记录 800ms `reconcile()` count/total/max/p95
- [x] 记录每次 reconcile 扫描消息数和增强节点数
- [x] 记录 `overlay-debug.js` 800ms refresh count/total/max
- [x] 验证隐藏状态是否继续执行两个 800ms interval
- [x] 隐藏状态仍执行时暂停 interval，恢复可见后重启
- [x] 删除 `injectOverlayScripts()` 中重复的 `overlay-translation.js`
- [x] 新增脚本注入列表无重复路径测试
- [x] 评估 debug overlay 是否只在性能/Debug 模式注入

### 翻译、AI 与泄漏

- [x] 记录 translation latency/cache hit/error
- [x] 记录 AI suggestion latency/error
- [x] 记录 API pending count 和 timeout
- [x] Overlay destroy 后 observer/interval/timeout/listener 为 0
- [x] 连续切换聊天 20 次后资源计数不增长
- [x] 不记录 peerId、requestId、消息文本

## Recipe 性能测试场景

### WhatsApp

- [ ] 空账号
- [ ] 100/500/2000 个聊天
- [ ] 打开 1000 条消息的会话
- [ ] 连续切换聊天 20 次
- [ ] 滚动历史消息 2 分钟
- [ ] 开启/关闭自动翻译
- [ ] 隐藏窗口 5 分钟
- [ ] BFCache pagehide/pageshow
- [ ] 网络断开/恢复

### Telegram

- [ ] Web A / Web K / Web Z
- [ ] 100/500/2000 个聊天
- [ ] 连续切换聊天 20 次
- [ ] 滚动历史消息 2 分钟
- [ ] 翻译开/关
- [ ] AI suggestion
- [ ] Debug overlay 显示/隐藏
- [ ] 窗口隐藏 5 分钟
- [ ] hashchange/BFCache

### Recipe 验收

- [ ] Overlay ready p50/p95
- [ ] reconcile p50/p95/max
- [ ] poll/scan p50/p95/max
- [ ] 每分钟 DOM 扫描节点数
- [ ] visible/hidden CPU 对比
- [ ] 聊天切换后资源计数回落
- [ ] API timeout/error rate
- [ ] 连续切换 20 次后 observer/timer/listener 不增长
- [ ] 单个 WebView 额外 CPU 低于 0.5%
- [ ] 单个 WebView 额外内存低于 2 MB

## 批次 5：资源与长稳

### 资源采样

- [ ] 使用 `app.getAppMetrics()`
- [ ] 使用 `process.getCPUUsage()`
- [ ] 使用 `process.getProcessMemoryInfo()`
- [ ] 窗口可见时每 60 秒采样
- [ ] 窗口隐藏时每 300 秒采样
- [ ] 应用退出时停止采样
- [ ] 记录 `resource.main_rss_mb`
- [ ] 记录 `resource.renderer_rss_mb`
- [ ] 记录 `resource.webview_rss_mb`
- [ ] 记录 `resource.main_cpu_percent`
- [ ] 记录 `resource.renderer_cpu_percent`
- [ ] 记录 `resource.webview_cpu_percent`
- [ ] 记录 `resource.webview_count`
- [ ] 记录 `resource.event_loop_lag_ms`
- [ ] 进程类型归一化为 `browser|renderer|utility|gpu|webview|unknown`
- [ ] 不为单个 WebView 添加 service ID 标签

### Long Task

- [ ] 记录 `renderer.long_task_count`
- [ ] 记录 `renderer.long_task_total_ms`
- [ ] 记录 `renderer.long_task_max_ms`
- [ ] 仅发送每分钟聚合结果
- [ ] 不逐条上传 Long Task

### 长稳验证

- [ ] 运行 8 小时测试
- [ ] 每小时检查 RSS
- [ ] 每小时检查 CPU
- [ ] 每小时检查 WebView 数量
- [ ] 每小时检查 Long Task
- [ ] 检查 RSS 是否持续单调增长
- [ ] 检查窗口隐藏后 CPU 是否回落
- [ ] 检查服务销毁后 WebView 数量是否回落

## 可用时间定义

### 第一版：Shell 可用

- [ ] 定义 `startup.shell_usable_ms`
- [ ] Renderer DOM 已提交
- [ ] SettingsStore 初始化完成
- [ ] 认证状态已确定
- [ ] 路由已渲染

### 第二版：业务可用

- [ ] 定义 `startup.active_service_usable_ms`
- [ ] Services API 已完成
- [ ] 活动 Service WebView 已 `dom-ready`
- [ ] Recipe 初始化已完成
- [ ] 未登录场景记录 `startup.auth_screen_usable_ms`
- [ ] 无服务场景记录 `startup.empty_state_usable_ms`
- [ ] 不混合不同启动路径

## 本地诊断开关

- [x] 支持 `AITALK --performance-metrics`
- [x] 支持 `PERFORMANCE_METRICS=1`
- [x] 支持 `DEBUG='Ferdium:Performance'`
- [x] 专用脚本默认启用 JSONL 输出
- [x] Main/Renderer 启动时自动初始化采集器
- [x] Main/Renderer 退出时清理、flush
- [x] 本地诊断采集 100% 指标
- [x] 本地诊断不上传
- [x] 本地诊断不受 `sentry` 设置控制

快速构建并运行真实解包生产版：

```bash
pnpm start:performance:packaged
```

复用现有解包产物，跳过构建：

```bash
pnpm start:performance:packaged -- --reuse
```

生产版脚本仅构建当前 OS/CPU 架构，使用 `electron-builder --dir`，跳过安装包、发布、签名、公证。指标每 60 秒输出至启动终端；JSONL 写入 Electron `userData/performance/metrics-<sessionId>.jsonl`。

## 生产遥测

- [ ] 沿用 `settings.app.sentry` 用户开关
- [ ] 用户同意后才初始化生产采集
- [ ] 用户同意后才创建 IPC listener
- [ ] 用户同意后才启动资源 timer
- [ ] 关闭后释放 observer、timer、IPC listener
- [ ] 主进程额外 CPU 目标低于 0.2%
- [ ] 内存队列目标低于 1 MB
- [ ] 每分钟 IPC 目标少于 100 条

## 采样策略

- [ ] 按 session 采样，禁止逐条随机采样
- [ ] 启动指标本地采集 100%，生产上传 10%
- [ ] 启动失败或超阈值上传 100%
- [ ] API 错误、超时上传 100%
- [ ] 普通 API 耗时上传 5%～10%
- [ ] WebView 加载上传 5%
- [ ] Long Task 聚合上传 5%
- [ ] CPU、内存按 1% session 上传
- [ ] React Profiler 默认关闭；需要时仅 1% session

## 生产上传：独立批次

### 前置条件

- [ ] 本地采集至少运行 3 天
- [ ] 指标语义稳定
- [ ] 指标数量稳定
- [ ] 隐私检查通过
- [ ] 明确选择 Sentry 或自有 API

### Sentry 方案

- [ ] 升级 `@sentry/electron`
- [ ] 验证 Electron 37 兼容性
- [ ] DSN 改为环境配置
- [ ] 配置 `sendDefaultPii: false`
- [ ] 配置 session sampling
- [ ] 验证 Main 初始化
- [ ] 验证 Renderer 初始化
- [ ] 验证崩溃捕获
- [ ] 验证性能 transaction
- [ ] 验证用户关闭遥测
- [ ] 验证离线启动
- [ ] 验证应用退出
- [ ] 验证 macOS
- [ ] 验证 Windows
- [ ] 验证 Linux

### 自有 API 备选

- [ ] 仅在 Sentry 不满足版本或成本要求时实施
- [ ] 设计 `POST /api/v1/desktop-performance/batch`
- [ ] 批量上传
- [ ] 上传前再次脱敏
- [ ] 上传失败不阻塞应用
- [ ] 上传失败丢弃或使用有上限的磁盘队列
- [ ] 不同时接入 Sentry 和自有 API

## 测试

### Request 测试

- [ ] 成功请求记录 duration
- [ ] 失败请求记录 duration 和 error 指标
- [ ] 缓存命中不记录真实请求
- [ ] inflight skip 不记录真实请求
- [ ] Hook 只触发一次

### WebView 测试

- [ ] attach 只记录一次
- [ ] `already_loaded` 路径正确
- [ ] 卸载后监听器清理
- [ ] service ID 不进入标签
- [ ] URL 不进入标签

### 手工场景 A：无账号冷启动

- [ ] 验证 `startup.main_ready_ms`
- [ ] 验证 `startup.renderer_loaded_ms`
- [ ] 验证 Paint 指标
- [ ] 验证 React 首次提交
- [ ] 验证 `startup.auth_screen_usable_ms`

### 手工场景 B：10 个 Service

- [ ] 每个 WebView 仅一条 attach 指标
- [ ] 每个 WebView 每个导航周期仅一条 `dom-ready`
- [ ] 无重复 load 指标
- [ ] WebView count 正确
- [ ] 启动完成后 CPU 回落

### 手工场景 C：本地服务首次启动

- [ ] 使用独立测试 Profile
- [ ] 验证 DB prepare
- [ ] 验证 Adonis boot
- [ ] 验证 local server start
- [ ] 验证首个 API 请求

## 验收标准

### 功能

- [ ] Debug 模式可重建完整启动时间线
- [ ] API 指标可区分 local/remote
- [ ] API 指标可区分成功、失败、缓存命中
- [ ] WebView 指标可按 `recipe_id` 排序
- [ ] Main 可看到 Renderer/WebView 资源占用
- [ ] 退出无未处理 Promise
- [ ] flush 不阻塞退出

### 隐私

- [ ] 检查 JSONL 不含邮箱
- [ ] 检查 JSONL 不含 Token
- [ ] 检查 JSONL 不含 Authorization
- [ ] 检查 JSONL 不含 service ID/name
- [ ] 检查 JSONL 不含完整 URL
- [ ] 检查 JSONL 不含请求/响应正文
- [ ] 检查 JSONL 不含聊天内容
- [ ] 检查 JSONL 不含本地绝对路径

### 性能开销

开启、关闭各运行 10 次：

- [ ] 冷启动中位数回归小于 2%
- [ ] 空闲 CPU 增量小于 0.2%
- [ ] 内存增量小于 5 MB
- [ ] 每分钟指标少于 100 条

### 代码质量

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## 仪表盘与告警

### 启动仪表盘

- [ ] `startup.main_ready_ms` p50/p95
- [ ] `startup.first_contentful_paint_ms` p50/p95
- [ ] `startup.react_first_commit_ms` p50/p95
- [ ] `startup.shell_usable_ms` p50/p95
- [ ] 按版本、平台、cold/warm、硬件加速、服务数量分桶

### API 仪表盘

- [ ] 请求量
- [ ] 错误率
- [ ] p50/p95/p99
- [ ] 超时率
- [ ] 重试率
- [ ] local/remote 对比

### WebView 仪表盘

- [ ] 按 `recipe_id` 展示 `dom-ready` p95
- [ ] 按 `recipe_id` 展示 load p95
- [ ] crash/reload rate
- [ ] 注入失败率
- [ ] WebView 数量与总 RSS 关系

### 长稳仪表盘

- [ ] 后台 CPU p95
- [ ] Long Task/min
- [ ] RSS 增长 MB/hour
- [ ] 按运行时长分桶：`<1h`、`1-8h`、`8-24h`、`>24h`

### 初始回归告警

- [ ] p95 相比上一稳定版本增加超过 20%
- [ ] 错误率增加超过 1 个百分点
- [ ] RSS/服务增加超过 20%
- [ ] 后台 CPU p95 超过 5%
- [ ] Long Task 总时长超过 1s/min

## 执行顺序

- [x] 批次 1：基础设施，预计 1 天
- [ ] 批次 2：启动链路，预计 1 天
- [ ] 批次 3：API 与本地服务，预计 1 天
- [ ] 批次 4：Service WebView，预计 1～2 天
- [ ] 批次 4A：Recipe 通用性能桥接，预计 1～2 天
- [ ] 批次 4B：WhatsApp Recipe，预计 1～2 天
- [ ] 批次 4C：Telegram Recipe，预计 1～2 天
- [ ] 批次 5：资源与长稳，预计 1 天
- [ ] 本地验证至少 3 天
- [ ] 批次 6：生产上传，独立评审、独立实施
- [ ] 上线后按 p95 排名只修前三项瓶颈
