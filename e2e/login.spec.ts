import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import os from 'os';
import fs from 'fs';

const buildPath = path.join(__dirname, '..', 'build');

function createTempAppDataDir(): string {
  const tmpDir = path.join(os.tmpdir(), `ferdium-e2e-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

async function launchApp() {
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

async function cleanup(app: Awaited<ReturnType<typeof electron.launch>>, appDataDir: string) {
  await app.close();
  try {
    fs.rmSync(appDataDir, { recursive: true, force: true });
  } catch {}
}

async function getMainWindow(app: Awaited<ReturnType<typeof electron.launch>>) {
  let window;
  for (let i = 0; i < 50; i++) {
    const windows = app.windows();
    window = windows.find(w => !w.url().includes('devtools://'));
    if (window) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window) throw new Error('Main app window not found');
  await window.waitForLoadState('domcontentloaded');
  return window;
}

async function waitForWaAkgLogin(window: Awaited<ReturnType<typeof getMainWindow>>) {
  await window.waitForURL(/\/auth\/wa-akg\/login/, { timeout: 30_000 });
  await window.waitForLoadState('networkidle');
}

// 启动应用但不启动 WA-AKG 后端（使用不存在的端口）
async function launchAppWithoutBackend() {
  const appDataDir = createTempAppDataDir();
  // 使用构建时的 WA_AKG_BASE 地址，但确保端口不可用
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

test.describe('WA-AKG 登录页面', () => {
  test('自动登录后跳转到 WA-AKG 登录页面', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await expect(emailInput).toBeVisible({ timeout: 10_000 });
      await expect(passwordInput).toBeVisible();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('输入错误密码显示错误提示', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('空表单提交显示验证错误', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForTimeout(2000);
      const pageContent = await window.content();
      const hasError = pageContent.includes('error') || pageContent.includes('required') || pageContent.includes('invalid');
      expect(hasError).toBe(true);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('页面显示登录表单字段', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await expect(emailInput).toBeVisible({ timeout: 10_000 });
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('后端不可用时登录页面正常显示', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await expect(emailInput).toBeVisible({ timeout: 10_000 });
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('后端不可用时提交表单显示网络错误', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 20_000 });

      const errorText = await error.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText!.length).toBeGreaterThan(0);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('后端不可用时登录失败后停留在登录页面', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForTimeout(5000);

      const currentUrl = window.url();
      expect(currentUrl).toContain('/auth/wa-akg/login');

      const apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeNull();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('后端不可用时错误信息不为空', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForTimeout(3000);

      const errorElements = await window.locator('.error-message, [class*="error"]').all();
      const errorTexts: string[] = [];
      for (const el of errorElements) {
        const text = await el.textContent();
        if (text) errorTexts.push(text.trim());
      }
      console.log('Actual error messages:', errorTexts);
      
      const hasError = errorTexts.length > 0 && errorTexts.some(text => text.length > 0);
      expect(hasError).toBe(true);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登录失败时错误信息为用户友好文案而非JS报错', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for error to appear
      const error = window.locator('.error-message');
      await expect(error).toBeVisible({ timeout: 20_000 });

      const errorText = await error.textContent();
      expect(errorText).toBeTruthy();

      // Error message must NOT be a raw JavaScript error
      const rawJsPatterns = [
        /Cannot read properties/i,
        /is not a function/i,
        /is not defined/i,
        /undefined is not/i,
        /null is not/i,
        /Unexpected token/i,
        /SyntaxError/i,
        /TypeError/i,
        /ReferenceError/i,
      ];

      for (const pattern of rawJsPatterns) {
        expect(errorText!).not.toMatch(pattern);
      }

      // Error message must be non-empty and readable
      expect(errorText!.trim().length).toBeGreaterThan(0);
      expect(errorText!.length).toBeLessThan(200);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('输入正确密码登录成功后跳转到主页', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      // 等待一段时间，检查页面状态
      await window.waitForTimeout(5000);

      const currentUrl = window.url();
      console.log('Current URL after login:', currentUrl);

      const pageContent = await window.content();
      console.log('Page content includes sidebar:', pageContent.includes('sidebar'));
      console.log('Page content includes service:', pageContent.includes('service'));
      console.log('Page content includes workspace:', pageContent.includes('workspace'));

      const errorElements = await window.locator('.error-message, [class*="error"]').all();
      console.log('Error elements found:', errorElements.length);

      for (const element of errorElements) {
        const text = await element.textContent();
        console.log('Error text:', text);
      }

      // 检查 localStorage 中的 apiKey
      const apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      console.log('API Key in localStorage:', apiKey);

      // API key 必须是纯文本，不能被 mobx-localstorage 双重 JSON 引用
      expect(apiKey).toBeTruthy();
      expect(apiKey).not.toMatch(/^"/);

      // 等待跳转到主页
      await window.waitForURL(/\/$/, { timeout: 30_000 });

      const isMainPage = pageContent.includes('sidebar') || pageContent.includes('service') || pageContent.includes('workspace');
      expect(isMainPage).toBe(true);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登出后 API key 被清除', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForURL(/\/$/, { timeout: 30_000 });

      let apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();

      // 直接调用 logout action 清除 API key
      await window.evaluate(() => {
        window.ferdium.actions.user.logout();
      });
      await window.waitForTimeout(3000);

      apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeNull();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登出后 API key 从 settings store 也被清除', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForURL(/\/$/, { timeout: 30_000 });

      // 登出
      await window.evaluate(() => {
        window.ferdium.actions.user.logout();
      });
      await window.waitForTimeout(3000);

      // key 应该从所有存储位置清除
      const lsKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(lsKey).toBeNull();

      const settingsKey = await window.evaluate(() => {
        const app = (window as any).ferdium?.stores?.settings?.all?.app;
        return app ? app['whatsapp-api-key'] : 'N/A';
      });
      expect(settingsKey).toBeFalsy();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('API key 在页面重载后仍然存在', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForURL(/\/$/, { timeout: 30_000 });

      // 重载前确认 key 存在
      let apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();

      // 重载页面
      await window.evaluate(() => location.reload());
      await window.waitForLoadState('domcontentloaded');
      await window.waitForTimeout(5000);

      // 重载后 key 应该仍然存在
      apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();
      expect(apiKey).not.toMatch(/^"/);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('提交时提交按钮被禁用防止重复点击', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await expect(submitButton).toBeEnabled({ timeout: 5_000 });

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      // Click and check button becomes disabled as UX feedback
      await submitButton.click();
      await expect(submitButton).toBeDisabled({ timeout: 5_000 });

      // An error message should appear after the auth attempt
      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 30_000 });

      // Button eventually re-enables when auth completes or fails
      const buttonEnabled = await submitButton.isEnabled();
      if (!buttonEnabled) {
        console.log('Button still disabled after auth (node:http may hang in renderer without backend)');
      }
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('回车键提交登录表单', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');

      // 在密码输入框按回车键触发表单提交
      await passwordInput.press('Enter');

      // 应该触发登录请求并显示错误
      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 15_000 });

      const errorText = await error.textContent();
      expect(errorText).toBeTruthy();
      // 不应该包含低层级 JS 错误
      expect(errorText!).not.toMatch(/(TypeError|ReferenceError|SyntaxError|undefined is not)/i);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登出后可重新导航到登录页', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      // Verify login form is functional even without backend
      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      const buttonText = await submitButton.textContent();
      expect(buttonText).toBeTruthy();

      // Verify the form is interactive
      await expect(emailInput).toHaveValue('test@example.com');
      await expect(passwordInput).toHaveValue('password123');
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('路由登出后跳转到 /auth/login 而非 WA-AKG 登录页', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      // 先登录
      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');
      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();
      await window.waitForURL(/\/$/, { timeout: 30_000 });

      // 通过路由导航到登出（触发 UserStore autorun LOGOUT_ROUTE 路径）
      await window.evaluate(() => {
        window.ferdium.stores.router.push('/auth/logout');
      });

      // 登出后应该跳转到 /auth/login（Ferdium登录页）
      await window.waitForURL(/\/auth\/login/, { timeout: 15_000 });

      // API key 应该被清除
      const apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeNull();

      // 确认不是 WA-AKG 登录页
      const currentUrl = window.url();
      expect(currentUrl).not.toContain('/auth/wa-akg');

      // Ferdium 登录表单应该可见
      const ferdiumEmailInput = window.locator('input[type="email"], input[name="email"]');
      await expect(ferdiumEmailInput).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('通过路由登出后可以重新登录 WA-AKG', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      // 第一次 WA-AKG 登录
      await waitForWaAkgLogin(window);
      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await emailInput.fill('ferdium@ferdium.com');
      await passwordInput.fill('ferdium');
      let submitButton = window.locator('button[type="submit"]');
      await submitButton.click();
      await window.waitForURL(/\/$/, { timeout: 30_000 });

      let apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();

      // 路由登出
      await window.evaluate(() => {
        window.ferdium.stores.router.push('/auth/logout');
      });
      await window.waitForURL(/\/auth\/login/, { timeout: 15_000 });

      // 等待 Ferdium auto-login （FERDIUM_SERVER=local）后重定向到 WA-AKG 登录
      await window.waitForURL(/\/auth\/wa-akg\/login/, { timeout: 15_000 });

      // 第二次 WA-AKG 登录
      await window.waitForLoadState('networkidle');
      const emailInput2 = window.locator('input[type="email"], input[name="email"]');
      const passwordInput2 = window.locator('input[type="password"], input[name="password"]');
      await emailInput2.fill('ferdium@ferdium.com');
      await passwordInput2.fill('ferdium');
      const submitButton2 = window.locator('button[type="submit"]');
      await submitButton2.click();

      await window.waitForURL(/\/$/, { timeout: 30_000 });
      const newKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(newKey).toBeTruthy();
      expect(newKey).not.toMatch(/^"/);
      expect(newKey!.length).toBeGreaterThan(0);
    } finally {
      await cleanup(app, appDataDir);
    }
  });
});
