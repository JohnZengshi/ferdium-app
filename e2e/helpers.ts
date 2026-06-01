import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { resolveBuildDir } from '../playwright.config';

export const buildPath = resolveBuildDir();

export function createTempAppDataDir(): string {
  const tmpDir = path.join(os.tmpdir(), `ferdium-e2e-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

export async function launchApp() {
  const appDataDir = createTempAppDataDir();
  const app = await electron.launch({
    args: [buildPath],
    env: {
      ...process.env,
      FERDIUM_SERVER: 'local',
      FERDIUM_APPDATA_DIR: appDataDir,
      NODE_ENV: 'test',
    },
  });
  return { app, appDataDir };
}

/**
 * 启动应用但不启动 WA-AKG 后端（使用不存在的端口）
 */
export async function launchAppWithoutBackend() {
  const appDataDir = createTempAppDataDir();
  const app = await electron.launch({
    args: [buildPath],
    env: {
      ...process.env,
      FERDIUM_SERVER: 'local',
      WA_AKG_BASE: 'http://localhost:1',
      FERDIUM_APPDATA_DIR: appDataDir,
      NODE_ENV: 'test',
    },
  });
  return { app, appDataDir };
}

export async function cleanup(app: ElectronApplication, appDataDir: string) {
  await app.close();
  try {
    fs.rmSync(appDataDir, { recursive: true, force: true });
  } catch {}
}

export async function getMainWindow(app: ElectronApplication) {
  let window: any;
  for (let i = 0; i < 50; i++) {
    const windows = app.windows();
    window = windows.find((w: any) => !w.url().includes('devtools://'));
    if (window) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window) throw new Error('Main app window not found');
  await window.waitForLoadState('domcontentloaded');
  return window;
}

export async function waitForWaAkgLogin(window: any) {
  await window.waitForURL(/\/auth\/wa-akg\/login/, { timeout: 30_000 });
  await window.waitForLoadState('networkidle');
}

export async function fillLoginForm(window: any, email: string, password: string) {
  const emailInput = window.locator('input[type="email"], input[name="email"]');
  const passwordInput = window.locator('input[type="password"], input[name="password"]');
  await emailInput.fill(email);
  await passwordInput.fill(password);
  return { emailInput, passwordInput };
}

export async function doLogin(window: any, email = 'ferdium@ferdium.com', password = 'ferdium') {
  await fillLoginForm(window, email, password);
  const submitButton = window.locator('button[type="submit"]');
  await submitButton.click();
  await window.waitForURL(/\/$/, { timeout: 30_000 });
}

/**
 * 通过点击侧边栏的 Settings 齿轮按钮导航到设置页面（真实用户操作）
 */
export async function navigateToSettings(window: any) {
  const settingsButton = window.locator('.sidebar__button--settings');
  await expect(settingsButton).toBeVisible({ timeout: 10_000 });
  await settingsButton.click();
  // Wait for settings page to load
  await expect(window.locator('.settings-wrapper')).toBeVisible({ timeout: 10_000 });
}
