# AGENT.md — Ferdium 项目规范指南

> 基于代码知识图谱综合分析生成。本文档为 AI 代理（Claude Code、CodeGraph 等）提供操作此代码库的完整规范。

---

## 一、项目概览

**Ferdium** 是一个 Electron 桌面应用，将 Slack、WhatsApp、Gmail 等消息服务聚合到单一窗口。它是 Franz 的硬分叉（hard-fork），无功能限制。

| 属性 | 值 |
|------|-----|
| 技术栈 | Electron 37 + React 18 + MobX 6 + TypeScript 5 |
| 构建工具 | esbuild + electron-builder |
| 内嵌服务端 | AdonisJS 5 + SQLite |
| 包管理 | pnpm 10.14.0 |
| Node.js | 22.18.0 |
| 测试 | Jest（esbuild-runner 转译） |
| 代码质量 | ESLint（Airbnb + TS + React + Unicorn + Sonar，--max-warnings 0）+ Prettier（集成在 ESLint 中）+ Biome |
| Git 规范 | Conventional Commits（commitlint）、pre-commit hooks（typecheck + lint + prettier + test） |

---

## 二、架构分层（10 层）

### 2.1 应用核心层 — Application Core

| 路径 | 职责 |
|------|------|
| `src/index.ts` | **Electron 主进程入口**。应用生命周期、窗口创建、IPC 初始化、深链接、自动更新、系统托盘 |
| `src/app.tsx` | **Renderer 进程入口**。挂载 React 应用树 |
| `src/config.ts` | **全局配置**。最高扇入（68 条入边），整个代码库引用的中心化配置 |
| `src/routes.tsx` | **路由定义**（FerdiumRoutes 类，扇出 30），映射 URL 路径到 Screen 组件 |
| `src/environment.ts` | 开发/预发/生产环境检测 |
| `src/I18n.tsx` | 国际化初始化 |
| `src/preload-safe-debug.ts` | preload 脚本桥接 |
| `src/sentry.ts` | 错误上报 |

**规则**：`config.ts` 是核心枢纽，新增全局配置必须在此添加；新增路由必须在 `routes.tsx` 中注册。

### 2.2 Electron 主进程层 — Electron Main Process

`src/electron/` — 主进程工具模块：

| 模块 | 职责 |
|------|------|
| `Settings.ts` | 持久化设置（electron-store） |
| `deepLinking.ts` | 自定义协议处理器（ferdium://） |
| `windowUtils.ts` | 窗口位置/大小管理 |
| `exception.ts` | 全局异常捕获 |
| `macOSPermissions.ts` | macOS 权限管理 |

`src/lib/` — 操作系统集成：

| 模块 | 职责 |
|------|------|
| `Menu.ts` | 自定义应用菜单 |
| `Tray.ts` | 系统托盘图标 + 上下文菜单 |
| `DBus.ts` | Linux 桌面通知 |
| `TouchBar.ts` | macOS Touch Bar |
| `Form.ts` | 表单辅助 |

**IPC 规则**：所有 IPC handler 遵循统一模式 — `ipcMain.handle('event-name', handler)`，通过 `src/electron/ipc-api/` 注册，preload 脚本通过 `contextBridge.exposeInMainWorld()` 暴露渲染进程 API。

### 2.3 UI 组件层 — UI Components

`src/components/` （~75 个组件）+ `src/containers/` （~25 个容器）：

```
src/components/
├── ui/               # 通用 UI 基元（Button、Modal、Select、Tabs、Toggle、Loader…）
│   ├── button/
│   ├── modal/
│   ├── tabs/
│   ├── badge/
│   ├── input/
│   ├── select/
│   ├── loader/
│   └── effects/      # 动画封装（Appear CSSTransition）
├── settings/         # 设置页面组件
│   ├── account/
│   ├── navigation/
│   ├── recipes/
│   ├── services/
│   └── user/
├── services/         # 服务视图组件
│   ├── content/      # ServiceView、ServiceWebview、WebviewCrashHandler
│   └── tabs/         # Tabbar、TabItem、TabBarSortableList
├── auth/             # 认证组件
├── layout/           # 布局（AppLayout、Sidebar）
├── home/             # 首页组件
├── util/             # 工具组件
└── downloadManager/  # 下载管理
```

**组件编写规则**：
- 使用 `inject` + `observer`（mobx-react）连接 MobX store
- **TDesign React 优先**：应用全量采用腾讯 `tdesign-react` 作为基础 UI 框架（配合 `tdesign-icons-react`）。
- **TailwindCSS 配合**：新组件布局、间距优先使用 Tailwind utility classes（`src/styles/tailwind.css`）辅助。
- 传统组件可用 SCSS 或 react-jss theme 管理样式，逐步向 TDesign 迁移
- 支持主题变量（theme.xxx），避免硬编码颜色值

### 2.4 状态管理层 — State Management

**MobX Stores**（`src/stores/index.ts` 集中注册）：

| Store | 职责 |
|-------|------|
| `AppStore` | 全局应用状态、定时器、焦点管理 |
| `ServicesStore` | 服务实例生命周期、未读计数 |
| `RecipesStore` | 可用 recipe 模板 |
| `RecipePreviewsStore` | Recipe 预览浏览与搜索 |
| `RequestStore` | API 请求生命周期、错误追踪、本地服务端口 |
| `UserStore` | 用户认证和资料 |
| `SettingsStore` | 应用设置持久化 |
| `UIStore` | UI 状态（侧边栏、主题） |
| `FeaturesStore` | 功能开关 |
| `NavigationStore` | 活跃模块/标签页导航状态 |
| `GlobalErrorStore` | 全局错误收集与展示 |
| `DigitalHumanStore` | 数字人管理（创建、分配、列表） |

**Actions**（`src/actions/`）：

`app.ts`、`service.ts`、`settings.ts`、`user.ts`、`ui.ts`、`recipe.ts`、`recipePreview.ts` — 每个 store 对应的 action 调度器。

**Store 辅助库**（`src/stores/lib/`）：

- `CachedRequest.ts` — 缓存请求封装
- `Reaction.ts` — MobX reaction 封装
- `Request.ts` — 请求状态管理
- `TypedStore.ts` — 类型化 store 基类

**规则**：
- Store 初始化模式：每个 store 接收其他所有 store、API 层和 actions 的引用
- 数据流：`Actions → Stores → Components（observer 自动响应）`
- 新增 store 必须在 `src/stores/index.ts` 注册

### 2.5 API 服务层 — API & Services

**双后端架构**（`src/api/index.ts` 统一接口）：

```
api/index.ts → 统一 API 接口
├── ServerApi（远程 Ferdium 服务器）
└── LocalApi（本地 AdonisJS 内嵌服务器）
```

**API 模块**：

| 模块 | 领域 |
|------|------|
| `AppApi.ts` | 应用级 API |
| `ServicesApi.ts` | 服务 CRUD |
| `RecipesApi.ts` | Recipe 管理 |
| `UserApi.ts` | 用户认证/资料 |
| `FeaturesApi.ts` | 功能标志 |
| `RecipePreviewsApi.ts` | Recipe 预览 |

**数据模型**（`src/models/`）：

| 模型 | 职责 |
|------|------|
| `Recipe.ts` | 服务类型模板（URL 模式、消息能力、暗色模式、UA） |
| `Service.ts` | 运行中的服务实例（WebView、分区隔离、未读计数） |
| `User.ts` | 用户模型 |
| `UserAgent.ts` | UA 覆盖 |
| `RecipePreview.ts` | Recipe 预览信息 |

### 2.6 WebView 层 — WebView Integration

每个消息服务运行在隔离的 Electron WebView 中。`src/webview/` 脚本注入到每个 WebView：

| 脚本 | 职责 |
|------|------|
| `recipe.ts` | 核心编排器（扇出 34） |
| `badge.ts` | 从页面标题/DOM 提取未读计数 |
| `darkmode.ts` | 暗色模式 CSS 注入 |
| `notifications.ts` | 捕获服务通知 |
| `contextMenu.ts` | 自定义右键菜单 |
| `find.ts` | 页面内查找 |
| `screenshare.ts` | 屏幕共享 |
| `spellchecker.ts` | 拼写检查 |
| `zoom.ts` | 缩放控制 |
| `dialogTitle.ts` | 对话框标题检测 |
| `sessionHandler.ts` | 会话管理 |
| `lib/RecipeWebview.ts` | WebView 生命周期基类 |
| `lib/Userscript.ts` | 用户脚本支持 |

**规则**：
- 所有注入脚本通过 `webview.executeJavaScript()` 执行
- 与主进程通信通过 `ipcRenderer`，遵循 `event-name` 命名约定

### 2.7 内部服务端层 — Internal Server

嵌入式 AdonisJS 5 服务器（`src/internal-server/`），提供离线/本地优先 API：

```
internal-server/
├── start.ts           # 服务启动
├── start/
│   ├── routes.js      # API 路由定义
│   ├── kernel.js      # 中间件注册
│   └── migrate.js     # 数据库迁移
├── config/            # AdonisJS 配置（app、auth、cors、database、session、shield…）
├── database/
│   ├── migrations/    # SQLite schema 迁移
│   └── template.sqlite
├── resources/views/   # Edge 模板
└── public/            # CSS/JS 静态资源
```

**数据库表**：users、services、recipes、workspaces

### 2.8 特性层 — Features

每个特性是自包含模块（`src/features/`），带自己的 store、组件和初始化：

| 特性 | 标识 | 功能 |
|------|------|------|
| workspaces | `features/workspaces/` | 服务分组（拖拽抽屉） |
| todos | `features/todos/` | 内置待办面板（独立 WebView） |
| basicAuth | `features/basicAuth/` | WebView HTTP 基本认证 |
| quickSwitch | `features/quickSwitch/` | Cmd+K 服务快速切换 |
| appearance | `features/appearance/` | 主题/强调色管理 |
| serviceProxy | `features/serviceProxy/` | 每服务代理配置 |
| communityRecipes | `features/communityRecipes/` | 社区 recipe 浏览器 |
| webControls | `features/webControls/` | WebView 导航控制 |
| publishDebugInfo | `features/publishDebugInfo/` | 调试信息发布 |
| whatsappAutomation | `features/whatsappAutomation/` | WhatsApp 多账号自动化 |
| customerProfile | `features/customerProfile/` | 客户资料管理（CRUD、分配） |

**规则**：
- 使用 `FeatureStore.ts` 基类 + `ActionBinding.ts` 工具
- 通过 `src/features/<name>/index.ts` 统一初始化
- 新增特性必须包含：`index.ts`（初始化入口）+ `store.ts`（状态）+ `components/`（UI）+ 可选 `containers/`

### 2.9 表现层 — Presentation Assets

**样式体系**（四层混合架构）：

```
样式优先级：TailwindCSS > SCSS > react-jss theme
```

| 层次 | 技术 | 职责 | 入口 |
|------|------|------|------|
| 1️⃣ 组件框架层 | **TDesign React** | 全量基础 UI 组件（按钮、弹窗、Tab、输入框、选择器、徽标等），配合 `tdesign-icons-react` 图标库 | `tdesign-react` + `tdesign-icons-react` |
| 2️⃣ 新 UI 工具层 | **TailwindCSS** | 新增组件的布局、间距、排版等 utility 类 | `src/styles/tailwind.css`（仅 `@tailwind utilities`，禁用 preflight） |
| 3️⃣ 历史全局层 | **SCSS** | 传统页面结构、全局样式、表单/布局等静态样式 | `src/styles/main.scss`（聚合 30+ 模块） |
| 4️⃣ 主题/组件层 | **react-jss 主题系统** | 组件视觉规则、设计 token、暗色/默认双主题 | `src/themes/` 下的 JS 配置 |

**SCSS 样式系统**（`src/styles/`）：

```
main.scss (入口，扇出 21)
├── config.scss        # 设计 Token 变量
├── colors.scss        # 品牌色板
├── globals.scss       # 全局默认样式
├── mixins.scss        # 可复用 mixin
├── reset.scss         # CSS reset
├── type.scss          # 排版
├── animations.scss    # 动画
├── layout.scss        # 布局
├── *.scss             # 各组件样式（badge、button、input、tabs…）
└── title-bar.scss     # Electron 自定义标题栏
```

> **注意**：SCSS 仅用于遗留样式维护，不再新增 SCSS 文件。新 UI 一律使用 TailwindCSS。

**TailwindCSS**（`tailwind.config.js`）：

- `preflight: false` — 不重置全局样式，安全叠加在现有 SCSS 之上
- 内容扫描范围：`src/**/*.{ts,tsx,js,jsx}`
- 构建输出：`build/styles/tailwind.css`
- 开发模式：通过 `esbuild.mjs` 中的 `runTailwind()` 以 spawn 方式监听文件变化

**主题系统**（`src/themes/`）：

| 主题 | 路径 |
|------|------|
| Dark | `src/themes/dark/index.ts` |
| Default | `src/themes/default/index.ts` |
| Legacy | `src/themes/legacy/index.ts` |

**国际化**（`src/i18n/`）：

- 30+ 语言 locale JSON 文件
- 通过 Crowdin 平台管理翻译
- 运行 `pnpm manage-translations` 同步

### 2.10 基础设施层 — Infrastructure

| 领域 | 配置 |
|------|------|
| 构建 | `esbuild.mjs`（ts/tsx + scss → build/） |
| 打包 | `electron-builder.yml` |
| CI/CD | `.github/workflows/builds.yml` |
| Docker | `Dockerfile` |
| Git hooks | `.husky/pre-commit`、`.husky/commit-msg` |
| 代码质量 | ESLint、Biome、Prettier、`tsconfig.json`（strict） |
| 测试 | `jest.config.js` |

---

## 三、关键模式与约定

### 3.1 开发工作流

```bash
pnpm install           # 安装依赖
pnpm dev               # esbuild 开发服务器（:8080）
pnpm start:all-dev     # 开发 + Electron 一并启动
pnpm typecheck         # TS 类型检查（提交前必须通过）
pnpm lint:fix          # ESLint + 自动修复
pnpm test              # Jest 测试
pnpm prepare-code      # 完整预提交检查（typecheck + lint + prettier + 翻译）
```

### 3.2 Git 规范

- **提交格式**：`type(scope): description`（Conventional Commits）
  - 类型：`fix:`、`feat:`、`chore:`、`refactor:`、`docs:`、`test:`
  - scope 示例：`(settings)`、`(webview)`、`(recipes)`、`(server)`
- **pre-commit**：`pnpm prepare-code` + `pnpm test`
- **禁止**：`--no-verify` 跳过 hooks、force push、空提交

### 3.3 代码质量红线

| 规则 | 说明 |
|------|------|
| 类型安全 | 禁用 `as any`、`@ts-ignore`、`@ts-expect-error` |
| 错误处理 | 禁止空 catch 块 `catch(e) {}` |
| 测试 | 禁止删除失败测试来"通过" |
| Lint | ESLint `--max-warnings 0`，零容忍 |
| 提交 | 禁止 `--no-verify` 跳过 hooks |

**ESLint + Prettier 协同配置：**

项目使用 `plugin:prettier/recommended`（必须放在 extends 数组最后），自动：
1. 启用 `eslint-plugin-prettier`，将 Prettier 格式问题作为 ESLint 错误报告
2. 启用 `eslint-config-prettier`，禁用所有与 Prettier 冲突的 ESLint 规则（如 `@typescript-eslint/brace-style`、`indent` 等）
3. 确保 Prettier 的格式优先级高于 ESLint 的样式规则

**注意事项：**
- ⚠️ 如遇到 Prettier 和 ESLint 规则冲突（如格式化成多行但 ESLint 要求单行），检查 `.eslintrc.js` 中 `extends` 数组顺序，确保 `'plugin:prettier/recommended'` 在最后
- ✅ 所有样式规则由 Prettier 处理（通过 `.prettierrc.js`），ESLint 专注于代码质量和最佳实践
- ✅ pre-commit hook 会先运行 Prettier 格式化，再运行 ESLint 检查，避免冲突

### 3.4 MobX 数据流规范

```
Actions (src/actions/)
    ↓ 触发
Stores (src/stores/) — MobX 可观察状态
    ↓ observer() 包裹
Components (src/components/) — React 自动响应
```

- Store 通过构造函数注入（`stores/index.ts` 集中管理）
- 组件使用 `@inject('StoreName')` + `@observer` 装饰器或 `observer()` HOC
- 所有异步请求使用 `CachedRequest` / `Request` 封装管理加载/错误状态

### 3.5 样式规范

| 规则 | 说明 |
|------|------|
| **TailwindCSS 优先** | 新 UI 组件强制使用 Tailwind utility classes，禁止内联静态 `style={}`。仅动态运行时值（动画等）可用 `style={}` |
| **Inline style 禁止** | `style={}` 中不得出现硬编码 CSS 值（如 `fontSize: '28px'`），统一用 Tailwind 任意值语法（`text-[28px]`）替代 |
| **SCSS 遗产** | 不删除/重构现有 SCSS 文件，不作新增。全局结构样式继续有效 |
| **主题支持** | 所有颜色值必须支持深色/浅色双主题，通过 react-jss ThemeProvider 或 `.theme__dark` CSS 类切换 |
| **设计 Token** | 使用 `config.scss` 中的 SCSS 变量（`$brand-primary`）或 themes 对象中的 JS token |
| **无障碍** | 尊重 `prefers-reduced-motion` 媒体查询 |
| **Preflight** | Tailwind 的 preflight 已禁用，可安全与 SCSS 共存 |

### 3.6 特性模块开发规范

新增特性必须遵循以下结构：

```
src/features/<name>/
├── index.ts           # 初始化入口（必需）
├── store.ts           # 状态管理（推荐）
├── actions.ts         # action 调度（可选）
├── constants.ts       # 常量定义（可选）
├── api.ts             # API 通信（可选）
├── components/        # UI 组件（可选）
│   ├── YourComponent.tsx
│   └── ...
├── containers/        # 页面容器（可选）
│   └── ...
└── models/            # 数据模型（可选）
    └── ...
```

- 使用 `FeatureStore` 基类扩展 store
- 通过 `<name>/index.ts` 在应用启动时注册

### 3.7 构建与发布流水线

```
开发：pnpm dev → esbuild dev server (:8080)
测试：pnpm test → Jest → coverage
构建：pnpm build → esbuild → build/
                    → electron-builder → macOS(.dmg,.zip)
                                        → Windows(NSIS installer, portable)
                                       → Linux(.deb,.AppImage,.rpm)
发布：GitHub CI → code sign → notarize → publish
```

---

## 四、目录图（完整文件结构）

```
ferdium-app/
├── src/
│   ├── index.ts              # 主进程入口
│   ├── app.tsx               # 渲染进程入口
│   ├── config.ts             # 全局配置（最高扇入）
│   ├── routes.tsx            # 路由定义
│   ├── environment.ts        # 环境配置
│   ├── I18n.tsx              # i18n 初始化
│   ├── sentry.ts             # 错误上报
│   │
│   ├── stores/               # MobX 状态管理
│   ├── actions/              # Action 调度器
│   ├── api/                  # API 通信层
│   ├── models/               # 数据模型
│   ├── components/           # React 组件
│   ├── containers/           # 页面容器
│   ├── features/             # 自包含特性模块
│   ├── webview/              # WebView 注入脚本
│   ├── electron/             # 主进程工具
│   ├── lib/                  # 系统集成
│   ├── internal-server/      # 嵌入式 AdonisJS 服务端
│   ├── agent-flow-cs/        # Agent Flow CS API 客户端（OpenAPI + orval 生成）
│   ├── whatsapp-automation/  # WhatsApp 自动化 API 客户端
│   ├── helpers/              # 工具函数
│   ├── styles/               # SCSS 样式系统
│   ├── themes/               # 主题配置
│   ├── i18n/                 # 国际化
│   └── @types/               # TypeScript 类型定义
│
├── test/                     # 测试文件
├── scripts/                  # 构建/迁移脚本
├── recipes/                  # 服务 recipe 子模块
├── build-helpers/            # 构建辅助
├── docs/                     # 文档
│
├── esbuild.mjs               # 构建配置
├── tsconfig.json             # TS 配置（strict）
├── jest.config.js            # 测试配置
├── playwright.config.ts      # E2E 测试配置
├── electron-builder.yml      # 打包配置
├── commitlint.config.js      # 提交规范
├── package.json              # 依赖管理
└── Dockerfile                # 容器构建
```

---

## 五、AI 代理操作指南

### 5.1 任务分类与路由

| 任务类型 | 处理方式 |
|----------|----------|
| 查找代码/模式 | 优先使用 CodeGraph 工具（`codegraph_search`、`codegraph_context`） |
| 架构理解 | `codegraph_context` 获取全景 → `codegraph_explore` 深入特定符号 |
| 新增组件 | 放入 `src/components/<area>/`，优先使用 TailwindCSS，避免新增 SCSS |
| 新增 Store | 在 `src/stores/` 创建，在 `src/stores/index.ts` 注册 |
| 新增特性 | 在 `src/features/` 创建完整的自包含模块 |
| 修改 WebView | 在 `src/webview/` 中修改，注意 IPC 通信模式 |
| 修改 API | 在 `src/api/` 中修改，注意双后端（Server + Local）同步 |
| 修复 Bug | 最小化修改，不重构。先定位再修复 |
| 重构 | 先通过 `codegraph_impact` 分析影响范围 |
| 新增依赖 | 优先使用已有库（@mdi/js、react-jss、lodash） |
| **样式调整** | 新 UI 强制使用 Tailwind `className`，禁止内联静态 `style={}`；修改旧样式用 SCSS；主题色值用 `src/themes/` |

### 5.2 文件编辑规范

- 使用 `edit` 工具进行精确替换，避免整个文件重写
- 编辑前先用 `Read` 读取完整文件
- 编辑后运行 `lsp_diagnostics` 验证类型正确
- 提交前运行 `pnpm typecheck` 和 `pnpm lint:fix`

### 5.3 搜索优先级

1. **CodeGraph**（结构信息）— `codegraph_search`、`codegraph_context`、`codegraph_trace`
2. **Grep**（文本内容）— 日志、注释、字符串字面量
3. **Glob**（文件名匹配）— 查找特定文件
4. **Explore Agent**（复杂多角度搜索）— 跨层模式发现

### 5.4 代码修改黄金法则

1. **Bugfix 最小化**：只改有问题的那几行，不重构周围的代码
2. **新代码匹配现有模式**：观察同类实现，保持一致风格
3. **类型安全**：永远不用 `as any` 或 `@ts-ignore`
4. **验证**：每次修改后运行 `lsp_diagnostics`
5. **测试**：与功能相关的测试必须在提交前通过

---

*本文档基于代码知识图谱分析生成，反映了 Ferdium 项目的实际架构和约定。更新代码库时请同步更新本文档。*

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tools** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them. `codegraph_node` returns one symbol's source + callers, or reads a whole file with line numbers. If the tools are listed but deferred, load them by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` and `codegraph node <symbol-or-file>` print the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
