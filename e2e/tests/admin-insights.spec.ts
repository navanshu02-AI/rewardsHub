import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test('hr admin can open hr insights from dashboard', async ({ page }) => {
  await loginAs(page, TEST_USERS.hrAdmin);

  const insightsLink = page.getByTestId('hr-insights-link');
  await expect(insightsLink).toBeVisible();
  await insightsLink.click();

  await expect(page).toHaveURL(/\/admin\/insights/);
  await expect(page.getByRole('heading', { name: 'HR insights' })).toBeVisible();
});
