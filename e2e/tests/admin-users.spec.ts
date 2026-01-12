import { expect, test } from '@playwright/test';
import path from 'node:path';
import { TEST_USERS } from '../constants/users';

const authDir = path.join(__dirname, '..', '.auth');
const storageState = path.join(authDir, 'hr.json');

test.describe('Admin users', () => {
  test.use({ storageState });

  test('hr admin can provision a user', async ({ page }) => {
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
});
