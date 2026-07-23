# 性能隐患记录（2026-07-23）

## 采样信息

- 启动方式：`pnpm start:performance:packaged`
- Session：`b09948e9-df6b-446a-87a4-96a60a66eaec`
- JSONL：`~/Library/Application Support/AITALK/performance/metrics-b09948e9-df6b-446a-87a4-96a60a66eaec.jsonl`
- 当前样本：145 条，跨度约 510 秒

## P0：Agent Flow 请求持续堆积

证据：

- `agent_flow.pending_high_watermark` 从 1 持续增长到 24。
- 17～24 基本每 30 秒增长一次，符合重复轮询特征。
- 已结束请求只有 13 条；后半段没有相应 `request_ms`、`request_error` 或 `request_timeout`。
- 堆积请求均为 `method=GET, api_group=other`，当前无法定位具体固定操作。

风险：

- 请求、Promise、AbortController、闭包和底层连接持续占用。
- 页面切换或长期运行后可能引发内存、Socket、CPU 增长。

建议：

- 为轮询请求增加明确超时、单飞/inflight 去重、卸载取消。
- 补充固定安全 `api_group` 规则；禁止记录 URL、query、用户或会话标识。
- 增加当前 pending gauge；高水位只表示历史峰值，不能证明实时未释放数量。

## P1：WebContents `did-stop-loading` 监听器超限

证据：

```text
MaxListenersExceededWarning: EventEmitter 11 did-stop-loading [WebContents]
```

风险：

- 监听器重复注册或清理不完整。
- 同一加载事件重复执行注入，长期运行后 CPU/内存增长。
- 可能与 `GUEST_VIEW_MANAGER_CALL: Script failed to execute` 的导航/销毁竞态相关。

建议：

- 审核 `src/models/Service.ts`、`src/components/services/content/ServiceWebview.tsx` 的注册/移除对称性。
- 不用 `setMaxListeners()` 掩盖问题。

## P1：Renderer 启动长任务

证据：

- `renderer.first_paint_ms = 3144ms`
- `renderer.first_contentful_paint_ms = 3144ms`
- 首个聚合窗口：15 个长任务，总计 3420ms，最大 1681ms。
- 后续窗口：10 个长任务，总计 662ms，最大 90ms。
- `resource.event_loop_lag_ms` 长期稳定在 5～6ms。

结论：启动阶段存在明显主线程阻塞；常态事件循环基本正常。

建议：继续完成启动链路、Store 构造/初始化细分指标，定位 1681ms 同步任务。

## P1：Agent Flow SSE 生命周期待确认

证据：

- `sse_active_high_watermark` 增长到 6。
- 连接耗时 15～74ms，速度正常。
- 样本内没有 `sse_close_count`、`sse_uptime_ms`。

判断：若当时正好有 6 个有效订阅，可能正常；若账号/订阅少于 6，可能重复订阅或旧连接未关闭。

建议：关闭对应页面/账号后确认 close/uptime 指标；核对活跃订阅数与实际账号数。

## P2：启动 API 竞态与慢请求

证据：

- 启动阶段 `getInfo/features/all` 约 493～506ms 后失败，随后 44～89ms 成功。
- 两次 `all` 成功请求分别为 1245ms、1261ms。
- 出现 3 次 `api.request_skipped_inflight`。

判断：启动阶段存在服务未就绪或重复触发；`all` 偶发超过 1.2 秒。

注意：当前 `backend=remote` 来自 Request 构造默认值，可能不代表运行时实际 local/remote 后端。

## P2：WhatsApp WebView 加载较慢

- WhatsApp `dom_ready` 中位数约 1170ms，`load` 中位数约 1200ms。
- Telegram `dom_ready` 中位数约 300ms。
- 两者 attach 均低于 11ms。

结论：差异主要来自页面/注入初始化，不是 Electron 挂载。

## 正常项

- Local Server：端口扫描 7ms、DB 1ms、Adonis 启动 460ms、总启动 470ms。
- Token：已有 Token 路径为 0ms。
- Agent Flow 已完成请求：中位数 43ms、最大 144ms。
- WhatsApp Automation：中位数 134ms、最大 451ms、并发高水位 3。
- macOS `_TIPropertyValueIsValid`：输入法上下文噪声，与本轮埋点无直接关系。
- `[DEP0180] fs.Stats`：依赖弃用警告，非当前性能瓶颈。

## 批次 3 未提交代码审查发现

### P1：缓存命中/重复请求会触发业务 Hook

`Request._hooks` 同时被 `GlobalErrorStore` 与性能采集使用。当前 `Request`/`CachedRequest` 为记录 `cache_hit`、`skipped_inflight` 主动调用 `_triggerHooks()`；`GlobalErrorStore._handleRequests()` 在非错误分支会清除 `authRequestFailed`。这改变了原有 Hook 语义：未完成请求也会被当作“成功完成”通知业务 Hook。

建议：性能事件使用独立 Hook/回调；不要复用完成态 `_triggerHooks()`。

### P1：Renderer teardown 后性能 Hook 未注销

`teardownRendererPerformance()` 只停止 observer/timer，没有从 `Request._hooks` 移除 `performanceRequestHook`。重新初始化 Renderer 性能采集时会重复注册，导致指标倍增和静态引用残留。

建议：`Request.registerHook()` 返回 disposer，teardown 调用 disposer；注册前保持幂等。

### P1：Local Server 端口上限逻辑发生行为变化

原逻辑会检查 `LOCAL_PORT + 10`；当前循环条件 `port < LOCAL_PORT + 10` 在到达上限时退出，未检查最后一个端口是否占用，随后直接启动服务。该修改超出埋点范围，可能导致端口冲突。

建议：恢复原扫描语义；计数逻辑包裹原流程，不改控制流。

### P2：`backend` 标签大面积误报

`Request` 默认 `backend=remote`，仅三个明确本地方法传入 `local`。应用默认可通过同一个 `ServerApi` 动态访问 Local Server，因此 `getInfo`、`all`、`features` 等在本地模式仍被标记为 remote；本次 JSONL 已出现该现象。

建议：完成时从运行时 server 配置判定，或将未知值改为固定 `unknown`，不要输出错误结论。

### P2：批次 3 验收测试覆盖不足

当前新增测试覆盖 `performance/request.ts` helper，但未覆盖：

- `Request`/`CachedRequest` 成功、失败、cache hit、inflight 的 Hook 次数和业务副作用。
- Local Server 端口扫描上限、启动失败、重复启动。
- `prepareLocalToken()` 四种状态。
- 两个真实 `customInstance` 的指标输出；WhatsApp Automation custom instance 没有对应测试。
- `subscribeSSE()` 主动关闭、服务端关闭、异常关闭的真实回调顺序。

因此 TODO 中“成功、失败 Hook 各只触发一次”“SSE 不重复计数”“generated API 自动覆盖”等勾选证据不足。

### P2：`api_group` 分类覆盖率低

Agent Flow 与 WhatsApp Automation 的 generated API 目录大多数落入 `other`。本次 Agent Flow 堆积请求全部为 `other`，无法定位具体固定操作。

建议：使用固定路径前缀映射覆盖实际 API 域；保持枚举、禁止原始 URL。

## 修复进展

已修复：

- 性能事件改用独立 Request metric hooks，不再触发 `GlobalErrorStore` 业务 Hook。
- Renderer teardown 注销性能 Hook，避免重复埋点。
- 请求增加 60 秒超时，pending 请求可结束；`HandoffStore` 增加单飞保护。
- 恢复 Local Server 端口扫描边界语义。
- `backend` 支持运行时 Local Server 判断。
- Agent Flow/WhatsApp Automation 使用固定路径映射减少 `api_group=other`。
- 增加真实 SSE graceful/error/cancel 生命周期测试。

仍需后续：

- 完成真实 WhatsApp Automation customInstance 测试。
- 完成 Local Server、Token、Request/CachedRequest 行为测试。
- 打包运行验证请求超时能产生 `request_timeout`。
