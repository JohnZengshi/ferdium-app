import { defineConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
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
          executablePath: path.join(projectRoot, 'node_modules', '.pnpm', 'electron@37.6.0', 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron'),
          args: [resolveBuildDir()],
        },
      },
    },
  ],
});
