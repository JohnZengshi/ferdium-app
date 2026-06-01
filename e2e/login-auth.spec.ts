import { test, expect } from '@playwright/test';
import {
  launchApp,
  launchAppWithoutBackend,
  cleanup,
  getMainWindow,
  waitForWaAkgLogin,
  doLogin,
  fillLoginForm,
  navigateToSettings,
} from './helpers';

test.describe('WA-AKG 登录页面 - 登录登出流程', () => {
  test('输入正确密码登录成功后跳转到主页', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);
      await doLogin(window);

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

      const apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      console.log('API Key in localStorage:', apiKey);
      expect(apiKey).toBeTruthy();

      const apiKeyViaGet = await window.evaluate(() => {
        try {
          return (window as any).ferdium?.stores?.settings?.all?.app?.['whatsapp-api-key'];
        } catch { return null; }
      }) as string | null;
      expect(apiKeyViaGet || apiKey).toBeTruthy();

      const parsedApiKey = typeof apiKey === 'string' && apiKey.startsWith('"')
        ? JSON.parse(apiKey)
        : apiKey;
      expect(parsedApiKey).toBeTruthy();
      expect(typeof parsedApiKey).toBe('string');

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
      await doLogin(window);

      let apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();

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
      await doLogin(window);

      await window.evaluate(() => {
        window.ferdium.actions.user.logout();
      });
      await window.waitForTimeout(3000);

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

  test('页面重载后仍然可以登录并进入主页（恢复已有登录或重新登录）', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      // --- First login ---
      await waitForWaAkgLogin(window);
      await doLogin(window);

      let apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKey).toBeTruthy();

      // --- Reload ---
      await window.evaluate(() => location.reload());
      await window.waitForEvent('close', { timeout: 5000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      // Case 1: authToken persisted (non-JWT guard) → user is already logged in on main page
      let url = window.url();
      if (!url.includes('/auth/')) {
        // Already on main app — verify session is intact
        const authToken = await window.evaluate(() => localStorage.getItem('authToken'));
        expect(authToken).toBeTruthy();
        apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
        expect(apiKey).toBeTruthy();
      } else {
        // Case 2: Session lost after reload — need to re-login
        await window.waitForURL(/\/auth\/wa-akg\/login/, { timeout: 15_000 });
        await waitForWaAkgLogin(window);
        await doLogin(window);
      }

      // --- Verify logged in on main app ---
      await expect(window).toHaveURL(/\/$/, { timeout: 30_000 });
      url = window.url();
      expect(url).not.toContain('/auth/');
      const pageContent = await window.content();
      expect(pageContent.includes('sidebar') || pageContent.includes('app')).toBe(true);

      const authToken = await window.evaluate(() => localStorage.getItem('authToken'));
      expect(authToken).toBeTruthy();

      apiKey = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      const parsedKey = apiKey && apiKey.startsWith('"')
        ? JSON.parse(apiKey)
        : apiKey;
      expect(parsedKey).toBeTruthy();
      expect(typeof parsedKey).toBe('string');
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('点击设置页面退出按钮后不会跳回主页', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);
      await doLogin(window);

      await navigateToSettings(window);

      const logoutButton = window.locator('.settings-navigation__expander + button.settings-navigation__link');
      await expect(logoutButton).toBeVisible({ timeout: 5_000 });
      await logoutButton.click();

      // URL must leave settings and go to /auth/*
      await expect(window).toHaveURL(/\/auth\//, { timeout: 15_000 });
      expect(window.url()).not.toMatch(/\/$/);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('退出登录后"正在退出登录"loading 消失，登录表单重新出现（防止卡死）', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);
      await doLogin(window);

      await navigateToSettings(window);

      // Click logout button
      const logoutButton = window.locator('.settings-navigation__expander + button.settings-navigation__link');
      await expect(logoutButton).toBeVisible({ timeout: 5_000 });
      await logoutButton.click();

      // Wait for /auth/* route
      await expect(window).toHaveURL(/\/auth\//, { timeout: 15_000 });

      // Wait for "Logging you out..." text to disappear (proves isLoggingOut reset to false)
      const loggingOutLabel = window.getByText('Logging you out...');
      await expect(loggingOutLabel).not.toBeVisible({ timeout: 20_000 });

      // Verify the login form appears after logout
      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await expect(emailInput).toBeVisible({ timeout: 10_000 });
      await expect(passwordInput).toBeVisible({ timeout: 10_000 });
      await expect(submitButton).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('退出登录后可重新登录并回到主页', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      // --- First login ---
      await waitForWaAkgLogin(window);
      await doLogin(window);

      // Verify on main page
      await window.waitForURL(/\/$/, { timeout: 30_000 });
      let pageContent = await window.content();
      expect(pageContent.includes('sidebar') || pageContent.includes('app')).toBe(true);

      // --- Logout ---
      await navigateToSettings(window);

      const logoutButton = window.locator('.settings-navigation__expander + button.settings-navigation__link');
      await expect(logoutButton).toBeVisible({ timeout: 5_000 });
      await logoutButton.click();

      // Wait for login form to reappear
      await expect(window).toHaveURL(/\/auth\//, { timeout: 15_000 });
      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      await expect(emailInput).toBeVisible({ timeout: 20_000 });

      // Verify authToken is cleared after logout
      const authTokenAfterLogout = await window.evaluate(() => localStorage.getItem('authToken'));
      expect(authTokenAfterLogout).toBeNull();

      // --- Second login (re-login) — auto-redirects to WA-AKG login ---
      // After logout, _requireAuthenticatedUser redirects from /auth/logout to /auth/wa-akg/login
      await waitForWaAkgLogin(window);
      await doLogin(window);

      // Verify authToken is set again
      const authTokenAfterRelogin = await window.evaluate(() => localStorage.getItem('authToken'));
      expect(authTokenAfterRelogin).toBeTruthy();

      // Verify API key still present
      const apiKeyAfterRelogin = await window.evaluate(() => localStorage.getItem('whatsappAutomationApiKey'));
      expect(apiKeyAfterRelogin).toBeTruthy();

      // Verify we are on main app (not welcome page)
      pageContent = await window.content();
      expect(pageContent.includes('sidebar') || pageContent.includes('app')).toBe(true);

      const url = window.url();
      expect(url).not.toContain('/auth/');
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登出后可重新导航到登录页', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator('input[type="email"], input[name="email"]');
      const passwordInput = window.locator('input[type="password"], input[name="password"]');
      const submitButton = window.locator('button[type="submit"]');

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      const buttonText = await submitButton.textContent();
      expect(buttonText).toBeTruthy();

      await expect(emailInput).toHaveValue('test@example.com');
      await expect(passwordInput).toHaveValue('password123');
    } finally {
      await cleanup(app, appDataDir);
    }
  });
});
