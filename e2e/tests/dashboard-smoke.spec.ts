import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('dashboard smoke', () => {
  test('opens recognition modal and toggles filters', async ({ page }) => {
    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    await page.getByTestId('recognition-open').click();
    const recognitionDialog = page.getByRole('dialog', { name: /celebrate a teammate/i });
    await expect(recognitionDialog).toBeVisible();
    await page.getByRole('button', { name: /close recognition modal/i }).click();
    await expect(recognitionDialog).toHaveCount(0);

    await page.getByTestId('reward-filters-toggle').click();
    await expect(page.getByTestId('reward-filters-panel')).toBeVisible();
  });
});
