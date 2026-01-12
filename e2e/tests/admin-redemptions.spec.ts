import { expect, test, type APIRequestContext } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

const loginAndGetToken = async (request: APIRequestContext, email: string, password: string) => {
  const response = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
    data: { email, password }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.access_token as string;
};

test.describe('admin redemptions page', () => {
  test('hr admin can see requested actions', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'hr', 'hr-only flow');

    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    const token = await loginAndGetToken(request, TEST_USERS.employee1.email, TEST_USERS.employee1.password);
    const userResponse = await request.get(`${BACKEND_URL}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(userResponse.ok()).toBeTruthy();
    const userData = await userResponse.json();

    const rewardsResponse = await request.get(`${BACKEND_URL}/api/v1/rewards?limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(rewardsResponse.ok()).toBeTruthy();
    const rewardsData = await rewardsResponse.json();

    const redeemableReward = rewardsData.find(
      (reward: { points_required: number; availability: number }) =>
        reward.availability > 0 && reward.points_required <= userData.points_balance
    );

    if (!redeemableReward) {
      throw new Error('No redeemable rewards available for this user to create a redemption.');
    }

    const redeemResponse = await request.post(`${BACKEND_URL}/api/v1/rewards/redeem`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        reward_id: redeemableReward.id
      }
    });
    expect(redeemResponse.ok()).toBeTruthy();

    await loginAs(page, {
      email: TEST_USERS.hrAdmin.email,
      password: TEST_USERS.hrAdmin.password
    });

    const redemptionsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/admin/redemptions') && response.request().method() === 'GET'
    );

    await page.goto('/admin/redemptions');
    await redemptionsResponsePromise;

    await page.getByLabel('Status').selectOption('requested');

    await expect(page.getByText('Requested').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' }).first()).toBeVisible();
  });
});
