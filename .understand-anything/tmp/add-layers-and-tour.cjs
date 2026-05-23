const fs = require('fs');
const path = require('path');
const root = 'F:\\project\\work\\ferdium-app';

const graph = JSON.parse(fs.readFileSync(path.join(root, '.understand-anything', 'intermediate', 'assembled-graph.json'), 'utf8'));
const layers = JSON.parse(fs.readFileSync(path.join(root, '.understand-anything', 'intermediate', 'layers.json'), 'utf8'));

// Re-map i18n locale config nodes from config layer to i18n layer
layers.forEach(layer => {
  if (layer.id === 'layer:i18n-localization') {
    const configLayer = layers.find(l => l.id === 'layer:configuration');
    if (configLayer) {
      const localeNodes = configLayer.nodeIds.filter(id => id.startsWith('config:src/i18n/'));
      localeNodes.forEach(id => {
        const idx = configLayer.nodeIds.indexOf(id);
        if (idx > -1) configLayer.nodeIds.splice(idx, 1);
        layer.nodeIds.push(id);
      });
    }
  }
});

graph.layers = layers;

// Create tour
graph.tour = [
  {
    order: 1,
    title: "Project Overview",
    description: "Ferdium is an Electron desktop app that aggregates messaging services into a single window. Start here to understand the project purpose, architecture, and contribution guide.",
    nodeIds: ["document:README.md", "document:CONTRIBUTING.md", "document:CLAUDE.md"]
  },
  {
    order: 2,
    title: "Configuration & Project Setup",
    description: "TypeScript strict mode, ESLint (Airbnb, zero warnings), Biome, Prettier, esbuild bundling, pnpm. All project-level config files.",
    nodeIds: ["config:package.json", "config:tsconfig.json", "config:electron-builder.yml", "file:esbuild.mjs"]
  },
  {
    order: 3,
    title: "Electron Main Process",
    description: "App lifecycle, window creation, IPC handler registration, auto-updates, deep linking, tray icon, global shortcuts, and internal server startup from src/index.ts.",
    nodeIds: ["file:src/index.ts", "file:src/electron/ipc-api/index.ts", "file:src/electron/Settings.ts", "file:src/electron/deepLinking.ts", "file:src/internal-server/start.ts"]
  },
  {
    order: 4,
    title: "State Management - Stores & Actions",
    description: "MobX stores for App, Services, Recipes, User, Settings, UI, and Features. Actions dispatch system for decoupled state changes.",
    nodeIds: ["file:src/stores/index.ts", "file:src/stores/ServicesStore.ts", "file:src/stores/SettingsStore.ts", "file:src/stores/UIStore.ts", "file:src/actions/index.ts", "file:src/actions/lib/actions.ts"]
  },
  {
    order: 5,
    title: "API Client Layer",
    description: "Dual-backend API: ServerApi for remote Ferdium server and LocalApi for embedded AdonisJS server. Covers services, recipes, users, features.",
    nodeIds: ["file:src/api/index.ts", "file:src/api/apiBase.ts", "file:src/api/server/ServerApi.ts", "file:src/api/server/LocalApi.ts", "file:src/api/ServicesApi.ts", "file:src/api/UserApi.ts"]
  },
  {
    order: 6,
    title: "Internal Server (AdonisJS)",
    description: "Embedded AdonisJS 5 backend with SQLite. Controllers for services, recipes, users, workspaces. Migrations, routes, and Edge templates.",
    nodeIds: ["file:src/internal-server/start/routes.js", "file:src/internal-server/start/kernel.js", "file:src/internal-server/app/Controllers/Http/ServiceController.js", "file:src/internal-server/app/Models/Service.js", "file:src/internal-server/config/database.js"]
  },
  {
    order: 7,
    title: "React Application UI",
    description: "Component tree: AppLayout, Sidebar, auth screens, settings panels, service tabs/webviews, modals, and MUI-based UI primitives.",
    nodeIds: ["file:src/app.tsx", "file:src/routes.tsx", "file:src/components/layout/AppLayout.tsx", "file:src/components/layout/Sidebar.tsx", "file:src/components/services/content/ServiceView.tsx", "file:src/containers/settings/SettingsWindow.tsx"]
  },
  {
    order: 8,
    title: "Service & Webview System",
    description: "Each service runs in an isolated webview with partition-based storage. Handles recipe loading, dark mode injection, notifications, context menus, spell checking, zoom.",
    nodeIds: ["file:src/webview/recipe.ts", "file:src/webview/lib/RecipeWebview.ts", "file:src/webview/notifications.ts", "file:src/webview/darkmode.ts", "file:src/webview/contextMenu.ts", "file:src/models/Service.ts", "file:src/models/Recipe.ts"]
  },
  {
    order: 9,
    title: "Feature Modules",
    description: "Self-contained features: Workspaces (service grouping), Todos, QuickSwitch, Basic Auth, Service Proxy, Community Recipes, Web Controls. Each has own store, components, IPC.",
    nodeIds: ["file:src/features/workspaces/index.ts", "file:src/features/workspaces/store.ts", "file:src/features/todos/index.ts", "file:src/features/todos/store.ts", "file:src/features/quickSwitch/index.ts", "file:src/features/basicAuth/index.ts", "file:src/features/serviceProxy/index.ts"]
  },
  {
    order: 10,
    title: "Themes & Styling",
    description: "Dark, default, and legacy themes. SCSS stylesheets organized by component. Emotion CSS-in-JS for dynamic styling.",
    nodeIds: ["file:src/themes/index.ts", "file:src/themes/dark/index.ts", "file:src/themes/default/index.ts", "markup:src/styles/main.scss", "markup:src/styles/globals.scss", "markup:src/styles/colors.scss"]
  },
  {
    order: 11,
    title: "Internationalization",
    description: "i18n system with 50+ language locales. React Intl-based translations with runtime language switching.",
    nodeIds: ["file:src/I18n.tsx", "file:src/i18n/languages.ts", "file:src/i18n/translations.ts", "file:src/i18n/globalMessages.ts"]
  },
  {
    order: 12,
    title: "Testing & Quality",
    description: "Jest test suites for themes, utilities, URL helpers, array helpers, and feature stores. ESLint zero-warnings policy enforced via pre-commit hooks.",
    nodeIds: ["file:test/themes/index.test.ts", "file:test/helpers/url-helpers.test.ts", "file:test/helpers/array-helpers.test.ts", "file:test/jsUtils.test.ts", "file:test/features/utils/FeatureStore.test.ts"]
  }
];

// Validate tour nodeIds exist in graph
const nodeIds = new Set(graph.nodes.map(n => n.id));
graph.tour.forEach(step => {
  step.nodeIds = step.nodeIds.filter(id => nodeIds.has(id));
});

fs.writeFileSync(path.join(root, '.understand-anything', 'intermediate', 'assembled-graph.json'), JSON.stringify(graph, null, 2));
console.log('Added layers and tour to assembled graph.');
console.log('Layers:', graph.layers.length);
console.log('Tour steps:', graph.tour.length);
