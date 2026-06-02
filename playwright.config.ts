import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const projectRoot = __dirname;

export function resolveBuildDir(): string {
  if (process.env.E2E_BUILD_DIR) {
    return path.resolve(process.env.E2E_BUILD_DIR);
  }
  const snapshotDir = path.join(projectRoot, 'build-e2e');
  if (fs.existsSync(snapshotDir)) {
    return snapshotDir;
  }
  return path.join(projectRoot, 'build');
}

/**
 * Resolve the Electron executable path for the current platform.
 */
export function resolveElectronPath(): string {
  const electronDir = path.join(
    projectRoot,
    'node_modules',
    '.pnpm',
    'electron@37.6.0',
    'node_modules',
    'electron',
    'dist',
  );

  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(electronDir, 'electron.exe');
  }
  if (platform === 'darwin') {
    return path.join(
      electronDir,
      'Electron.app',
      'Contents',
      'MacOS',
      'Electron',
    );
  }
  // Linux and others
  return path.join(electronDir, 'electron');
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath: resolveElectronPath(),
          args: [resolveBuildDir()],
        },
      },
    },
  ],
});
