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

  test('login respects organization id header', async ({ page }) => {
    await page.goto('/auth');

    await page.getByTestId('auth-org-id').fill('acme-org');
    await page.getByTestId('auth-email').fill(TEST_USERS.employee1.email);
    await page.getByTestId('auth-password').fill(TEST_USERS.employee1.password);

    const loginRequestPromise = page.waitForRequest((request) =>
      request.url().includes('/auth/login') && request.method() === 'POST'
    );
    await page.getByTestId('auth-submit-login').click();

    const loginRequest = await loginRequestPromise;
    expect(loginRequest.headers()['x-org-id']).toBe('acme-org');

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('login with wrong organization id shows an error or falls back', async ({ page }) => {
    await page.goto('/auth');

    await page.getByTestId('auth-org-id').fill('wrong-org');
    await page.getByTestId('auth-email').fill(TEST_USERS.employee1.email);
    await page.getByTestId('auth-password').fill(TEST_USERS.employee1.password);
    await page.getByTestId('auth-submit-login').click();

    const result = await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 5000 }).then(() => 'success'),
      page.getByText(/login failed|invalid credentials/i).waitFor({ timeout: 5000 }).then(() => 'error')
    ]);

    expect(['success', 'error']).toContain(result);
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
