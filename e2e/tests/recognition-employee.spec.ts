import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('employee recognition flow', () => {
  test('employee sends recognition to a peer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'employee', 'employee-only flow');

    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
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

    const scopeButtons = {
      peer: page.getByTestId('recognition-scope-peer'),
      report: page.getByTestId('recognition-scope-report'),
      global: page.getByTestId('recognition-scope-global')
    };

    for (const [scopeKey, button] of Object.entries(scopeButtons)) {
      const enabled = recipientsData?.[scopeKey]?.enabled ?? false;
      if (enabled) {
        await expect(button).toBeEnabled();
      } else {
        await expect(button).toBeDisabled();
      }
    }

    await expect(page.getByTestId('recognition-points')).toHaveCount(0);

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
      throw new Error('Expected to find emp2 in recognition recipients.');
    }

    if (selectedScope !== 'peer') {
      await scopeButtons[selectedScope].click();
    }

    await page.getByTestId('recognition-recipient').selectOption(selectedRecipientId);

    const message = `Automation recognition ${Date.now()}`;
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

    await page.goto('/recognitions');

    const sentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions') && response.request().method() === 'GET'
    );

    await page.getByTestId('recognition-history-direction-sent').click();
    await sentResponsePromise;

    await expect(page.getByTestId('recognition-history-list')).toContainText(message);
  });
});
