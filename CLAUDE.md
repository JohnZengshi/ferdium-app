# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ferdium is an Electron desktop app that aggregates messaging services (Slack, WhatsApp, Gmail, etc.) into a single window. It's a hard fork of Franz with no restrictions. Uses Electron + React + MobX + TypeScript with an embedded AdonisJS internal server.

## Essential Commands

```bash
pnpm install              # Install dependencies (requires Node 22.18.0, pnpm 10.14.0)
pnpm dev                  # Start esbuild in watch mode (serves on http://127.0.0.1:8080)
pnpm start                # Launch Electron with built app (run after dev or build)
pnpm start:all-dev        # Dev + Electron together (waits for dev server, then launches)
pnpm debug                # Same as start:all-dev but with DEBUG=Ferdium:* logging

pnpm test                 # Run Jest tests with coverage
pnpm test:watch           # Jest in watch mode
pnpm test -- --testPathPattern="test/helpers"  # Run specific test files

pnpm typecheck            # TypeScript type checking (tsc --noEmit)
pnpm lint                 # ESLint with zero warnings allowed (--max-warnings 0)
pnpm lint:fix             # ESLint with auto-fix + cache
pnpm prepare-code         # Full pre-commit check: typecheck + lint:fix + biome + prettier + translations
pnpm build                # Production build: esbuild + electron-builder

pnpm test:e2e             # Playwright end-to-end tests
pnpm test:e2e:ui          # Playwright E2E with UI mode
pnpm test:e2e:debug       # Playwright E2E with debugger
```

## Git Hooks

- **pre-commit**: Runs `pnpm prepare-code` then `pnpm test` (skipped if node_modules missing)
- **commit-msg**: Enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint (e.g., `fix:`, `feat:`, `chore:`)

## Architecture

### Process Model (Electron)

- **Main process** (`src/index.ts`): App lifecycle, window management, IPC handlers, deep linking, auto-updates, tray icon, global shortcuts
- **Renderer process** (`src/app.tsx`): React UI with MobX state management and React Router

### State Management (MobX)

All stores are in `src/stores/` and initialized together in `src/stores/index.ts`. Each store receives references to all other stores, the API layer, and actions:

| Store | Purpose |
|-------|---------|
| `AppStore` | Global app state, timers, focus |
| `ServicesStore` | Service instances lifecycle, unread counts |
| `RecipesStore` | Available recipe templates |
| `RecipePreviewsStore` | Recipe preview browsing and search |
| `RequestStore` | API request lifecycle, error tracking, local server port |
| `UserStore` | Authentication and user profile |
| `SettingsStore` | App settings persistence |
| `UIStore` | UI state (sidebar, theme) |
| `FeaturesStore` | Feature flags |
| `NavigationStore` | Active module/tab navigation state |
| `GlobalErrorStore` | Global error collection and display |
| `DigitalHumanStore` | Digital human management (create, assign, list) |

Feature-specific stores: `workspaceStore`, `communityRecipesStore`, `todosStore`, `whatsappAutomationStore`, `customerProfileStore` (in `src/features/`)

### API Layer

`src/api/index.ts` creates the API interface with two backends:
- **ServerApi** (`server`): Remote Ferdium server communication
- **LocalApi** (`local`): Embedded AdonisJS server for offline/local-first operation

Individual API classes: `AppApi`, `ServicesApi`, `RecipesApi`, `UserApi`, `FeaturesApi`, `RecipePreviewsApi`

### Recipe/Service System

- **Recipe** (`src/models/Recipe.ts`): Template defining a service type (URL pattern, message capabilities, dark mode, custom user agent)
- **Service** (`src/models/Service.ts`): Running instance of a recipe with its own WebView, partition isolation, observable state (unread counts, enabled/muted, notification settings)
- Recipes are loaded from the `ferdium-recipes` git submodule into `recipes/`

### Internal Server

`src/internal-server/`: AdonisJS 5 backend with SQLite database running on localhost. Provides local API for offline functionality. Has its own controllers, models, migrations, and routes.

### Feature Modules

Each feature in `src/features/` is self-contained with its own store, components, and initialization:
- `workspaces` - Service grouping
- `todos` - Built-in todo functionality
- `basicAuth` - HTTP basic auth handling
- `quickSwitch` - Service switching (Cmd/Ctrl+K)
- `serviceProxy` - Per-service proxy configuration
- `appearance` - Theme/accent color management
- `communityRecipes` - Community recipe browser
- `whatsappAutomation` - WhatsApp multi-account automation
- `customerProfile` - Customer profile management

### Key Directories

- `src/components/` - React UI components (organized by feature area: auth, settings, services, layout, home, util)
- `src/actions/` - MobX action dispatchers
- `src/helpers/` - Utility functions (URL, validation, userAgent, i18n)
- `src/themes/` - Theme configs (dark, default, legacy)
- `src/i18n/` - Translations (managed via `pnpm manage-translations`)
- `src/electron/` - Main process utilities (IPC API, Settings, deep linking)
- `src/lib/` - System integrations (Menu, Tray, TouchBar, DBus)
- `src/agent-flow-cs/` - Agent Flow CS API client (generated from OpenAPI spec via orval)
- `src/whatsapp-automation/` - WhatsApp automation API client and profile storage

### Build System

Uses **esbuild** (`esbuild.mjs`) for bundling. Compiles TS/TSX to CommonJS, processes SCSS, copies static assets to `./build`. Packaging via **electron-builder** (`electron-builder.yml`) for macOS/Windows/Linux.

### Styling

**Style priority**: TailwindCSS > SCSS > react-jss theme.

- **TDesign React** (`tdesign-react` + `tdesign-icons-react`): Primary UI component library providing base components (buttons, modals, tabs, inputs, selects, badges, etc.). Use TDesign components as the foundation for all UI elements.
- **TailwindCSS** (`src/styles/tailwind.css`): Utility layer for layout, spacing, and visual adjustments on top of TDesign. **MUST** use Tailwind utility classes (`className`) instead of inline `style={}` props for all layout and visual styling. Inline `style={}` is only acceptable for dynamic runtime values (e.g., animating transforms, computed positions). Hardcoded CSS values in `style={}` are forbidden — use Tailwind arbitrary values (`p-[40px]`, `text-[var(--x)]`) or theme tokens instead.
  - Preflight (CSS reset) is disabled to avoid conflicts with existing SCSS globals.
  - Only `@tailwind utilities;` is used — no base or components resets.
  - Config in `tailwind.config.js`.
- **SCSS** (`src/styles/`): Legacy static layout and structural styles. Do NOT add new SCSS files for component styling — use TailwindCSS instead.
- **react-jss theme** (`src/themes/`): Theme definitions (dark, default, legacy) providing design tokens and component style rules via ThemeProvider.
- **User customization**: `USER_DATA/Ferdium/config/custom.css` for end-user CSS overrides.

## Testing

- **Unit tests**: Jest with `esbuild-runner/jest` transform. Tests in `src/` (colocated) and `test/` directories. Node test environment. Internal server tests currently skipped (see `jest.config.js`).
- **E2E tests**: Playwright (`pnpm test:e2e`). Config in `playwright.config.ts`, results in `test-results/`.

## Code Quality

- ESLint: Airbnb + React (jsx-runtime + @eslint-react) + Jest + Unicorn + Sonar + Prettier configs. Zero warnings policy.
- Biome: Secondary linter for import organization.
- Prettier: Single quotes, arrow parens avoided.
- TypeScript: Strict mode with decorators enabled (for MobX).
