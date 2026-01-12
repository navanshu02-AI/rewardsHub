import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

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

  test('employee can view points ledger entries after redeeming a reward', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'employee', 'employee-only flow');

    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const orgId = await page.evaluate(() => localStorage.getItem('orgId'));

    if (!token) {
      throw new Error('Expected auth token to be available after login.');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`
    };

    if (orgId) {
      headers['X-Org-Id'] = orgId;
    }

    const userResponse = await request.get(`${BACKEND_URL}/api/v1/users/me`, { headers });
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();

    const rewardsResponse = await request.get(`${BACKEND_URL}/api/v1/rewards?limit=100`, { headers });
    expect(rewardsResponse.ok()).toBeTruthy();
    const rewardsData = await rewardsResponse.json();

    const redeemableReward = rewardsData.find(
      (reward: { points_required: number; availability: number }) =>
        reward.availability > 0 && reward.points_required <= userData.points_balance
    );

    if (!redeemableReward) {
      throw new Error('No redeemable rewards available for this user to create a ledger entry.');
    }

    const redeemResponse = await request.post(`${BACKEND_URL}/api/v1/rewards/redeem`, {
      headers,
      data: {
        reward_id: redeemableReward.id
      }
    });
    expect(redeemResponse.ok()).toBeTruthy();

    const ledgerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/points/ledger/me') && response.request().method() === 'GET'
    );

    await page.goto('/points');
    await ledgerResponsePromise;

    const rows = page.getByTestId('points-ledger-row');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });
});
