#!/usr/bin/env node
// Phase 4: Architecture layer assignment based on file path patterns
const fs = require('fs');

const graph = JSON.parse(fs.readFileSync(
  'F:\\project\\work\\ferdium-app\\.understand-anything\\intermediate\\assembled-graph.json', 'utf8'));

// Define layers with path pattern matching
const layerDefs = [
  {
    id: "layer:configuration",
    name: "Configuration & Project Settings",
    description: "Project-level configuration files including TypeScript config, linter rules, build tooling config, environment variables, and dependency manifests.",
    match: (fp) => {
      const rootConfigs = [
        '.all-contributorsrc','.codespellrc','.dockerignore','.eslintignore','.npmrc','.nvmrc',
        '.prettierrc.js','biome.json','commitlint.config.js','crowdin.yml','tsconfig.json',
        'package.json','electron-builder.yml','electron-builder.env','electron-builder.npmrc',
        'jest.config.js','src/dev-app-update.yml'
      ];
      return rootConfigs.includes(fp) || fp.startsWith('config:');
    }
  },
  {
    id: "layer:documentation",
    name: "Documentation",
    description: "Project documentation including README, changelog, contributing guides, security policies, and technical documentation.",
    match: (fp) => fp.startsWith('document:')
  },
  {
    id: "layer:build-infrastructure",
    name: "Build & Infrastructure",
    description: "Build tooling, CI/CD, Docker configuration, and infrastructure scripts that compile, package, and deploy the application.",
    match: (fp) => {
      const items = ['esbuild.mjs','infra:Dockerfile'];
      return items.includes(fp) || fp.startsWith('script:');
    }
  },
  {
    id: "layer:branding-assets",
    name: "Branding & Assets",
    description: "Brand assets including icons, images, DMG installer graphics, and social preview images used for application packaging and distribution.",
    match: (fp) => fp.startsWith('file:branding/') || fp.startsWith('file:build-helpers/')
  },
  {
    id: "layer:main-process",
    name: "Electron Main Process",
    description: "Electron main process entry point, window management, IPC handlers, deep linking, auto-updates, tray icon, and macOS permissions.",
    match: (fp) => {
      const paths = ['src/index.ts','src/electron-util.ts','src/config.ts','src/environment.ts',
        'src/environment-remote.ts','src/enforce-macos-app-location.ts','src/jsUtils.ts',
        'src/preload-safe-debug.ts','src/sentry.ts','src/electron/','src/lib/'];
      return paths.some(p => fp.startsWith('file:') && fp.slice(5).startsWith(p));
    }
  },
  {
    id: "layer:ipc-api",
    name: "IPC API Layer",
    description: "Inter-process communication handlers that bridge the Electron main process and renderer, covering auto-update, settings, downloads, DND, and more.",
    match: (fp) => fp.startsWith('file:src/electron/ipc-api/')
  },
  {
    id: "layer:type-definitions",
    name: "Type Definitions",
    description: "TypeScript type definitions and interfaces that provide type safety across the application.",
    match: (fp) => fp.startsWith('file:src/@types/') || fp === 'file:src/prop-types.ts' ||
      fp === 'file:src/models/IContextMenuParams.ts' || fp.startsWith('file:src/themes/IStyleTypes.ts')
  },
  {
    id: "layer:state-management",
    name: "State Management (MobX)",
    description: "MobX stores and actions that manage application state including services, settings, user data, UI state, and feature flags.",
    match: (fp) => fp.startsWith('file:src/stores/') || fp.startsWith('file:src/actions/')
  },
  {
    id: "layer:api-client",
    name: "API Client Layer",
    description: "HTTP API clients for communicating with the remote Ferdium server and the local AdonisJS server.",
    match: (fp) => fp.startsWith('file:src/api/')
  },
  {
    id: "layer:application-ui",
    name: "Application UI (React)",
    description: "React component tree including layout, authentication screens, settings panels, and UI primitives. Uses MUI and Emotion for styling.",
    match: (fp) => {
      return fp.startsWith('file:src/app.tsx') || fp.startsWith('file:src/routes.tsx') ||
        fp.startsWith('file:src/components/') || fp.startsWith('file:src/containers/') ||
        fp.startsWith('file:src/I18n.tsx') || fp.startsWith('file:src/themes/');
    }
  },
  {
    id: "layer:styles",
    name: "Styles & Theming",
    description: "SCSS stylesheets and Emotion-based styling providing the visual appearance, animations, and responsive layout of the application.",
    match: (fp) => fp.startsWith('markup:')
  },
  {
    id: "layer:internal-server",
    name: "Internal Server (AdonisJS)",
    description: "Embedded AdonisJS 5 backend running on localhost with SQLite database, providing offline-first local API for services, recipes, users, and workspaces.",
    match: (fp) => {
      return fp.startsWith('file:src/internal-server/') || fp.startsWith('config:src/internal-server/');
    }
  },
  {
    id: "layer:webview-system",
    name: "WebView System",
    description: "Service webview management including recipe loading, dark mode injection, context menus, notifications, spell checking, zoom, and session handling.",
    match: (fp) => fp.startsWith('file:src/webview/')
  },
  {
    id: "layer:features",
    name: "Feature Modules",
    description: "Optional feature modules including workspaces, todos, quick switch, basic auth, service proxy, community recipes, publish debug info, and web controls.",
    match: (fp) => fp.startsWith('file:src/features/')
  },
  {
    id: "layer:i18n-localization",
    name: "Internationalization & Localization",
    description: "Translation infrastructure supporting 50+ languages with JSON locale files and runtime language switching.",
    match: (fp) => fp.startsWith('file:src/i18n/') || fp.startsWith('config:src/i18n/')
  },
  {
    id: "layer:helpers-utilities",
    name: "Helpers & Utilities",
    description: "Shared utility functions for URL handling, validation, service management, recipes, user agent detection, and async operations.",
    match: (fp) => fp.startsWith('file:src/helpers/')
  },
  {
    id: "layer:models",
    name: "Data Models",
    description: "MobX observable data models representing core domain entities: Service, Recipe, User, RecipePreview, UserAgent.",
    match: (fp) => fp.startsWith('file:src/models/') && fp !== 'file:src/models/IContextMenuParams.ts'
  },
  {
    id: "layer:tests",
    name: "Tests",
    description: "Jest test suites for themes, utilities, URL helpers, and feature stores ensuring code quality and preventing regressions.",
    match: (fp) => fp.startsWith('file:test/')
  },
  {
    id: "layer:scripts-tools",
    name: "Scripts & Tools",
    description: "Development and maintenance scripts including build scripts, migration helpers, and crowdin contributor management.",
    match: (fp) => fp.startsWith('file:scripts/')
  }
];

// Assign layers
const layers = layerDefs.map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  nodeIds: []
}));

const assignedIds = new Set();
const unassigned = [];

graph.nodes.forEach(node => {
  let found = false;
  for (let i = 0; i < layerDefs.length; i++) {
    if (layerDefs[i].match(node.id)) {
      layers[i].nodeIds.push(node.id);
      assignedIds.add(node.id);
      found = true;
      break;
    }
  }
  if (!found) {
    unassigned.push(node.id);
  }
});

// Distribute unassigned nodes to reasonable layers
unassigned.forEach(id => {
  // Fallback: put into config if it's a config node
  if (id.startsWith('config:')) {
    layers[0].nodeIds.push(id); // Configuration layer
  } else if (id.startsWith('file:src/')) {
    // Put in main process as catch-all for src files
    const mainLayer = layers.find(l => l.id === 'layer:main-process');
    if (mainLayer) mainLayer.nodeIds.push(id);
  } else {
    // Config layer
    layers[0].nodeIds.push(id);
  }
});

// Remove empty layers and sort nodeIds
const nonEmptyLayers = layers.filter(l => l.nodeIds.length > 0);
nonEmptyLayers.forEach(l => l.nodeIds.sort());

// Write layers
fs.writeFileSync(
  'F:\\project\\work\\ferdium-app\\.understand-anything\\intermediate\\layers.json',
  JSON.stringify(nonEmptyLayers, null, 2));

console.log(`Layers created: ${nonEmptyLayers.length}`);
nonEmptyLayers.forEach(l => console.log(`  ${l.id}: ${l.nodeIds.length} nodes`));
console.log(`Total assigned: ${assignedIds.size + unassigned.length}/${graph.nodes.length}`);
console.log(`Unassigned (fallback distributed): ${unassigned.length}`);
