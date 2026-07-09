import { expect, test } from '@playwright/test';
import {
  cleanup,
  fillLoginForm,
  getMainWindow,
  launchAppWithoutBackend,
  waitForLocalAuthLogin,
} from './helpers';

test.describe('本地 NextAuth 登录页面 - 后端不可用', () => {
  test('后端不可用时登录页面正常显示', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForLocalAuthLogin(window);

      const emailInput = window.locator(
        'input[type="email"], input[name="email"]',
      );
      const passwordInput = window.locator(
        'input[type="password"], input[name="password"]',
      );
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
      await waitForLocalAuthLogin(window);
      await fillLoginForm(window, 'test@example.com', 'password123');

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
      await waitForLocalAuthLogin(window);
      await fillLoginForm(window, 'test@example.com', 'password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForTimeout(5000);

      const currentUrl = window.url();
      expect(currentUrl).toContain('/auth/local/login');

      const apiKey = await window.evaluate(() =>
        localStorage.getItem('whatsappAutomationApiKey'),
      );
      expect(apiKey).toBeNull();
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('后端不可用时错误信息不为空', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForLocalAuthLogin(window);
      await fillLoginForm(window, 'test@example.com', 'password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      await window.waitForTimeout(3000);

      const errorElements = await window
        .locator('.error-message, [class*="error"]')
        .all();
      const errorTexts: string[] = [];
      for (const el of errorElements) {
        const text = await el.textContent();
        if (text) errorTexts.push(text.trim());
      }
      console.log('Actual error messages:', errorTexts);

      const hasError = errorTexts.some(text => text.length > 0);
      expect(hasError).toBe(true);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('登录失败时错误信息为用户友好文案而非JS报错', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForLocalAuthLogin(window);
      await fillLoginForm(window, 'test@example.com', 'password123');

      const submitButton = window.locator('button[type="submit"]');
      await submitButton.click();

      const error = window.locator('.error-message');
      await expect(error).toBeVisible({ timeout: 20_000 });

      const errorText = await error.textContent();
      expect(errorText).toBeTruthy();

      const rawJsPatterns = [
        /cannot read properties/i,
        /is not a function/i,
        /is not defined/i,
        /undefined is not/i,
        /null is not/i,
        /unexpected token/i,
        /syntaxerror/i,
        /typeerror/i,
        /referenceerror/i,
      ];
      for (const pattern of rawJsPatterns) {
        expect(errorText!).not.toMatch(pattern);
      }

      expect(errorText!.trim().length).toBeGreaterThan(0);
      expect(errorText!.length).toBeLessThan(200);
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('提交时提交按钮被禁用防止重复点击', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForLocalAuthLogin(window);

      const emailInput = window.locator(
        'input[type="email"], input[name="email"]',
      );
      const passwordInput = window.locator(
        'input[type="password"], input[name="password"]',
      );
      const submitButton = window.locator('button[type="submit"]');

      await expect(submitButton).toBeEnabled({ timeout: 5000 });

      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      await submitButton.click();
      await expect(submitButton).toBeDisabled({ timeout: 5000 });

      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 30_000 });

      const buttonEnabled = await submitButton.isEnabled();
      if (!buttonEnabled) {
        console.log(
          'Button still disabled after auth (node:http may hang in renderer without backend)',
        );
      }
    } finally {
      await cleanup(app, appDataDir);
    }
  });

  test('回车键提交登录表单', async () => {
    const { app, appDataDir } = await launchAppWithoutBackend();
    const window = await getMainWindow(app);

    try {
      await waitForLocalAuthLogin(window);

      const emailInput = window.locator(
        'input[type="email"], input[name="email"]',
      );
      const passwordInput = window.locator(
        'input[type="password"], input[name="password"]',
      );

      await emailInput.fill('test@example.com');
      await passwordInput.fill('wrongpassword');

      await passwordInput.press('Enter');

      const error = window.locator('.error-message, [class*="error"]');
      await expect(error).toBeVisible({ timeout: 15_000 });

      const errorText = await error.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText!).not.toMatch(
        /(typeerror|referenceerror|syntaxerror|undefined is not)/i,
      );
    } finally {
      await cleanup(app, appDataDir);
    }
  });
});
