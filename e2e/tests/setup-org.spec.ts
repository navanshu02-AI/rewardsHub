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

  test('shows getting started card for new HR admins and allows dismissal', async ({ page }) => {
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

    const gettingStartedCard = page.getByTestId('getting-started-card');
    await expect(gettingStartedCard).toBeVisible();
    await expect(page.getByTestId('getting-started-add-users')).toHaveAttribute('href', '/admin/users');
    await expect(page.getByTestId('getting-started-add-rewards')).toHaveAttribute('href', '/admin/rewards');

    await page.getByTestId('getting-started-send-recognition').click();
    await expect(page.getByRole('heading', { name: 'Celebrate a teammate' })).toBeVisible();
    await page.getByRole('button', { name: 'Close recognition modal' }).click();

    await page.getByTestId('getting-started-dismiss').click();
    await expect(gettingStartedCard).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('getting-started-card')).toBeHidden();
  });
});
