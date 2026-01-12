import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('approval workflow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('executive recognition requires approval before points apply', async ({ page, request }) => {
    await loginAs(page, {
      email: TEST_USERS.executive.email,
      password: TEST_USERS.executive.password
    });

    const recipientsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions/recipients') &&
        response.request().method() === 'GET'
    );

    await page.getByTestId('recognition-open').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const recipientsResponse = await recipientsResponsePromise;
    const recipientsData = await recipientsResponse.json();

    const scopeOrder = ['peer', 'report', 'global'] as const;
    const targetFirstName = TEST_USERS.employee1.firstName;
    const targetLastName = TEST_USERS.employee1.lastName;
    let selectedScope: (typeof scopeOrder)[number] | null = null;
    let selectedRecipientId: string | null = null;

    for (const scopeKey of scopeOrder) {
      const match = recipientsData?.[scopeKey]?.recipients?.find(
        (recipient: { first_name: string; last_name: string; id: string }) =>
          recipient.first_name === targetFirstName && recipient.last_name === targetLastName
      );
      if (match) {
        selectedScope = scopeKey;
        selectedRecipientId = match.id;
        break;
      }
    }

    if (!selectedScope || !selectedRecipientId) {
      throw new Error('Expected to find emp1 in recognition recipients.');
    }

    if (selectedScope !== 'peer') {
      await page.getByTestId(`recognition-scope-${selectedScope}`).click();
    }

    await page.getByTestId('recognition-recipient').selectOption(selectedRecipientId);

    await page.getByTestId('recognition-points').fill('250');

    const message = `Executive approval flow ${Date.now()}`;
    await page.getByTestId('recognition-message').fill(message);

    await page.getByTestId('recognition-value-customer-focus').click();
    await page.getByTestId('recognition-value-ownership').click();

    const submitResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions') && response.request().method() === 'POST'
    );

    await page.getByTestId('recognition-submit').click();
    await submitResponsePromise;

    await expect(page.getByRole('dialog')).toHaveCount(0);

    const loginResponse = await request.post('/api/v1/auth/login', {
      data: {
        email: TEST_USERS.employee1.email,
        password: TEST_USERS.employee1.password
      }
    });
    expect(loginResponse.ok()).toBeTruthy();
    const { access_token: empToken } = await loginResponse.json();

    const getEmpPoints = async () => {
      const meResponse = await request.get('/api/v1/users/me', {
        headers: {
          Authorization: `Bearer ${empToken}`
        }
      });
      expect(meResponse.ok()).toBeTruthy();
      const meData = await meResponse.json();
      return meData.points_balance as number;
    };

    const pointsBeforeApproval = await getEmpPoints();

    await page.getByTestId('nav-user-menu').click();
    await page.getByTestId('nav-logout').click();
    await expect(page.getByTestId('auth-email')).toBeVisible();

    await loginAs(page, {
      email: TEST_USERS.hrAdmin.email,
      password: TEST_USERS.hrAdmin.password
    });

    const pendingResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions/pending') &&
        response.request().method() === 'GET'
    );
    await page.goto('/approvals');
    await pendingResponsePromise;

    const pendingHeading = page.getByRole('heading', { name: message });
    await expect(pendingHeading).toBeVisible();

    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions/') &&
        response.url().includes('/approve') &&
        response.request().method() === 'POST'
    );

    await pendingHeading.locator('..').getByRole('button', { name: 'Approve' }).click();
    await approveResponsePromise;

    await expect(pendingHeading).toHaveCount(0);

    await expect.poll(getEmpPoints).toBe(pointsBeforeApproval + 250);
  });
});
