import { expect, test } from '@playwright/test';
import {
  cleanup,
  fillLoginForm,
  getMainWindow,
  launchApp,
  waitForWaAkgLogin,
} from './helpers';

test.describe('WA-AKG 登录页面 - 基础表单', () => {
  test('自动登录后跳转到 WA-AKG 登录页面', async () => {
    const { app, appDataDir } = await launchApp();
    const window = await getMainWindow(app);

    try {
      await waitForWaAkgLogin(window);

      const emailInput = window.locator(
        'input[type="email"], input[name="email"]',
      );
      const passwordInput = window.locator(
        'input[type="password"], input[name="password"]',
      );

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
      await fillLoginForm(window, 'test@example.com', 'wrongpassword');

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
      const hasError =
        pageContent.includes('error') ||
        pageContent.includes('required') ||
        pageContent.includes('invalid');
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
});
