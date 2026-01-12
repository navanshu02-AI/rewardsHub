import { expect, test } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');
const storageState = path.join(authDir, 'hr.json');

test.describe('Admin rewards', () => {
  test.use({ storageState });

  test('hr admin can reach rewards admin page', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByTestId('nav-admin-menu').click();
    await page.getByTestId('nav-admin-rewards').click();

    await expect(page.getByRole('heading', { name: /admin rewards/i })).toBeVisible();
    await expect(page.getByTestId('create-reward-button')).toBeVisible();
  });
});
