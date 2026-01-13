import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('dashboard stats', () => {
  test('reflects ledger totals after recognition credit', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'hr', 'hr-only flow');

    await loginAs(page, {
      email: TEST_USERS.hrAdmin.email,
      password: TEST_USERS.hrAdmin.password
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
    const targetFirstName = TEST_USERS.employee2.firstName;
    const targetLastName = TEST_USERS.employee2.lastName;
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
      throw new Error('Expected to find employee2 in recognition recipients.');
    }

    if (selectedScope !== 'peer') {
      await page.getByTestId(`recognition-scope-${selectedScope}`).click();
    }

    await page.getByTestId('recognition-recipient').selectOption(selectedRecipientId);

    const message = `Dashboard stats recognition ${Date.now()}`;
    await page.getByTestId('recognition-message').fill(message);

    const pointsInput = page.getByTestId('recognition-points');
    await expect(pointsInput).toBeVisible();
    await pointsInput.fill('250');

    await page.getByTestId('recognition-value-customer-focus').click();
    await page.getByTestId('recognition-value-ownership').click();

    const submitResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions') && response.request().method() === 'POST'
    );

    await page.getByTestId('recognition-submit').click();
    await submitResponsePromise;

    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByTestId('nav-user-menu').click();
    await page.getByTestId('nav-logout').click();

    const ledgerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/points/ledger/me') && response.request().method() === 'GET'
    );

    await loginAs(page, {
      email: TEST_USERS.employee2.email,
      password: TEST_USERS.employee2.password
    });

    await ledgerResponsePromise;

    const parsePoints = (text: string) => Number(text.replace(/[^0-9.-]/g, ''));

    const availablePointsText = await page.getByTestId('stats-available-points-value').innerText();
    const totalEarnedText = await page.getByTestId('stats-total-earned-value').innerText();

    const availablePoints = parsePoints(availablePointsText);
    const totalEarned = parsePoints(totalEarnedText);

    expect(availablePoints).toBeGreaterThanOrEqual(250);
    expect(totalEarned).toBeGreaterThanOrEqual(250);
  });
});
