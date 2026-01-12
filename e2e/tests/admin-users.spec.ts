import { expect, test } from '@playwright/test';
import path from 'node:path';
import { TEST_USERS } from '../constants/users';

const authDir = path.join(__dirname, '..', '.auth');
const storageState = path.join(authDir, 'hr.json');

test.describe('Admin users', () => {
  test.use({ storageState });

  test('hr admin can provision and deactivate a user', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByTestId('nav-admin-menu').click();
    await page.getByTestId('nav-admin-users').click();

    await expect(page.getByRole('heading', { name: /admin users/i })).toBeVisible();

    const email = `autouser-${Date.now()}@acme.test`;

    await page.getByTestId('provision-user-button').click();

    const dialog = page.getByRole('dialog', { name: /provision user/i });
    await dialog.getByLabel(/first name/i).fill('Auto');
    await dialog.getByLabel(/last name/i).fill('User');
    await dialog.getByLabel(/email address/i).fill(email);
    await dialog.getByLabel(/temporary password/i).fill('TempPass123!');
    await dialog.getByLabel(/role/i).selectOption('employee');

    await dialog.getByRole('button', { name: /provision/i }).click();

    await expect(page.getByText(email)).toBeVisible();

    const row = page.getByRole('row', { name: new RegExp(email, 'i') });
    await row.getByRole('button', { name: /deactivate/i }).click();

    const statusDialog = page.getByRole('dialog', { name: /deactivate user/i });
    await statusDialog.getByRole('button', { name: /^deactivate$/i }).click();

    await expect(row.getByText(/inactive/i)).toBeVisible();
  });

  test('hr admin can import users via CSV', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByTestId('nav-admin-menu').click();
    await page.getByTestId('nav-admin-users').click();

    const email = `import-${Date.now()}@acme.test`;
    const csvPayload = [
      'email,first_name,last_name,role,manager_email,department',
      `${email},Import,User,employee,${TEST_USERS.manager.email},Engineering`
    ].join('\n');

    await page.getByTestId('import-csv-input').setInputFiles({
      name: 'users.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvPayload)
    });

    await page.getByTestId('import-csv-submit').click();

    await expect(page.getByText(/Created 1/i)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('invite link lets a user set their password', async ({ page, request }) => {
    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email: TEST_USERS.hrAdmin.email,
        password: TEST_USERS.hrAdmin.password,
      },
    });
    const { access_token: accessToken } = await loginResponse.json();

    const email = `invite-${Date.now()}@acme.test`;
    const provisionResponse = await request.post('/api/v1/users/provision', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        email,
        password: 'TempPass123!',
        first_name: 'Invite',
        last_name: 'User',
        role: 'employee',
      },
    });
    const { id: userId } = await provisionResponse.json();

    const inviteResponse = await request.post(`/api/v1/users/${userId}/invite`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const { invite_url: inviteUrl } = await inviteResponse.json();

    await page.goto(inviteUrl);

    await page.getByLabel(/new password/i).fill('Welcome123!');
    await page.getByLabel(/confirm new password/i).fill('Welcome123!');
    await page.getByRole('button', { name: /set password/i }).click();

    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });

    await page.getByTestId('auth-email').fill(email);
    await page.getByTestId('auth-password').fill('Welcome123!');
    await page.getByTestId('auth-submit-login').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
