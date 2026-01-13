import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('points ledger', () => {
  test('shows recognition awards in the ledger', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'executive', 'executive-only flow');

    await loginAs(page, {
      email: TEST_USERS.executive.email,
      password: TEST_USERS.executive.password
    });

    const recipientsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions/recipients') &&
        response.request().method() === 'GET'
    );

    await page.getByTestId('send-recognition-cta').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const recipientsResponse = await recipientsResponsePromise;
    const recipientsData = await recipientsResponse.json();

    const targetFirstName = TEST_USERS.employee1.firstName;
    const targetLastName = TEST_USERS.employee1.lastName;
    let selectedRecipientId: string | null = null;

    const match = recipientsData?.recipients?.find(
      (recipient: { first_name: string; last_name: string; id: string }) =>
        recipient.first_name === targetFirstName && recipient.last_name === targetLastName
    );
    if (match) {
      selectedRecipientId = match.id;
    }

    if (!selectedRecipientId) {
      throw new Error('Expected to find emp1 in recognition recipients.');
    }

    await page.getByTestId('recognition-recipient').selectOption(selectedRecipientId);
    await page.getByLabel('Recognition type').selectOption('spot_award');

    const message = `Points recognition ${Date.now()}`;
    await page.getByTestId('recognition-message').fill(message);

    const pointsInput = page.getByTestId('recognition-points');
    await expect(pointsInput).toBeVisible();
    await pointsInput.fill('50');

    await page.getByTestId('recognition-value-customer-focus').click();
    await page.getByTestId('recognition-value-ownership').click();

    const submitResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions') && response.request().method() === 'POST'
    );

    await page.getByTestId('recognition-submit').click();
    const submitResponse = await submitResponsePromise;
    const submitData = await submitResponse.json();
    const recognitionId = submitData?.id;

    expect(recognitionId).toBeTruthy();

    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByTestId('nav-user-menu').click();
    await page.getByTestId('nav-logout').click();

    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    const ledgerResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/points/ledger/me') && response.request().method() === 'GET'
    );

    await page.goto('/points');
    await ledgerResponsePromise;

    const ledgerTable = page.getByTestId('points-ledger-table');
    await expect(ledgerTable).toContainText('recognition award');
    await expect(ledgerTable).toContainText('recognition');
    await expect(ledgerTable).toContainText('+50 pts');
    await expect(ledgerTable).toContainText(recognitionId);
  });
});
