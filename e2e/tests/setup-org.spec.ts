import { test, expect } from '@playwright/test';

test.describe('organization setup', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('bootstrap org redirects to dashboard and logs in', async ({ page }) => {
    const timestamp = Date.now();
    const orgName = `Acme ${timestamp}`;
    const adminEmail = `admin@acme-${timestamp}.com`;
    const adminPassword = `Passw0rd!${timestamp}`;

    await page.goto('/setup');

    await page.getByTestId('setup-org-name').fill(orgName);
    await page.getByTestId('setup-admin-first-name').fill('Ada');
    await page.getByTestId('setup-admin-last-name').fill('Lovelace');
    await page.getByTestId('setup-admin-email').fill(adminEmail);
    await page.getByTestId('setup-admin-password').fill(adminPassword);

    await page.getByTestId('setup-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();

    const storedSession = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      orgId: localStorage.getItem('orgId')
    }));

    expect(storedSession.token).toBeTruthy();
    expect(storedSession.orgId).toBeTruthy();
  });
});
