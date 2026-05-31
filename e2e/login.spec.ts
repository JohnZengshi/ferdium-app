import { test, expect } from '@playwright/test';

test.describe('登录页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
  });

  test('页面加载正常', async ({ page }) => {
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('输入错误密码显示错误提示', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    const error = page.locator('.error-message');
    await expect(error).toBeVisible({ timeout: 10_000 });
  });

  test('空表单提交显示验证错误', async ({ page }) => {
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    const errorMessages = page.locator('.error-message');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('页面包含注册和忘记密码链接', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /create.*account/i });
    const forgotLink = page.getByRole('link', { name: /forgot.*password/i });

    await expect(signupLink).toBeVisible();
    await expect(forgotLink).toBeVisible();
  });
});
