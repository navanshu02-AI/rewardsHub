import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('dashboard filters', () => {
  test('collapses advanced filters and tracks active count', async ({ page }) => {
    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    await expect(page.getByTestId('reward-filters-toggle')).toBeVisible();
    await expect(page.getByTestId('reward-filters-panel')).toHaveCount(0);
    await expect(page.getByTestId('reward-filters-count')).toHaveText('0');

    await page.getByTestId('reward-filters-toggle').click();
    await expect(page.getByTestId('reward-filters-panel')).toBeVisible();

    await page.getByLabel('Min points').fill('250');
    await expect(page.getByTestId('reward-filters-count')).toHaveText('1');
  });
});
