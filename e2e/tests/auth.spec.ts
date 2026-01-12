import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('authentication flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated users to auth when visiting dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByTestId('auth-email')).toBeVisible();
  });

  test('employee login lands on dashboard', async ({ page }) => {
    await page.goto('/auth');

    await page.getByTestId('auth-email').fill(TEST_USERS.employee1.email);
    await page.getByTestId('auth-password').fill(TEST_USERS.employee1.password);
    await page.getByTestId('auth-submit-login').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
  });

  test('logout returns to unauthenticated state and protects dashboard', async ({ page }) => {
    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    await page.getByTestId('nav-user-menu').click();
    await page.getByTestId('nav-logout').click();

    await expect(page.getByTestId('auth-email')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByTestId('auth-email')).toBeVisible();
  });
});
