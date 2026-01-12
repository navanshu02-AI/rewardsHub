import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('employee redemptions page', () => {
  test('employee can load redemptions without unauthorized errors', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'employee', 'employee-only flow');

    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    const redemptionsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/rewards/redemptions/me') && response.request().method() === 'GET'
    );

    await page.goto('/redemptions');

    const redemptionsResponse = await redemptionsResponsePromise;
    expect(redemptionsResponse.status()).toBe(200);

    await expect(page.getByRole('heading', { name: /my redemptions/i })).toBeVisible();
    await expect(page.getByText(/unauthorized|not authenticated|401/i)).toHaveCount(0);
  });
});
