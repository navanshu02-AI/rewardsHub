import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../constants/users';
import { loginAs } from '../helpers/auth';

test.describe('manager recognition flow', () => {
  test('manager sends recognition to a direct report', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'manager', 'manager-only flow');

    await loginAs(page, {
      email: TEST_USERS.manager.email,
      password: TEST_USERS.manager.password
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

    const reportScope = recipientsData?.report;
    if (!reportScope?.enabled) {
      throw new Error('Expected direct reports scope to be enabled for manager.');
    }

    const reportRecipients = reportScope.recipients ?? [];
    const emp1Match = reportRecipients.find(
      (recipient: { first_name: string; last_name: string; id: string }) =>
        recipient.first_name === TEST_USERS.employee1.firstName &&
        recipient.last_name === TEST_USERS.employee1.lastName
    );
    const emp2Match = reportRecipients.find(
      (recipient: { first_name: string; last_name: string; id: string }) =>
        recipient.first_name === TEST_USERS.employee2.firstName &&
        recipient.last_name === TEST_USERS.employee2.lastName
    );

    if (!emp1Match || !emp2Match) {
      throw new Error('Expected emp1 and emp2 to appear in direct reports recipients.');
    }

    const nonReportMatch = reportRecipients.find(
      (recipient: { first_name: string; last_name: string }) =>
        recipient.first_name === TEST_USERS.executive.firstName &&
        recipient.last_name === TEST_USERS.executive.lastName
    );

    if (nonReportMatch) {
      throw new Error('Expected non-report executive to be excluded from direct reports recipients.');
    }

    const recipientSelect = page.getByTestId('recognition-recipient');
    const peerOptions = await recipientSelect.locator('option').allTextContents();

    await page.getByTestId('recognition-scope-report').click();

    await expect(recipientSelect).toContainText(
      `${TEST_USERS.employee1.firstName} ${TEST_USERS.employee1.lastName}`
    );
    await expect(recipientSelect).toContainText(
      `${TEST_USERS.employee2.firstName} ${TEST_USERS.employee2.lastName}`
    );
    await expect(recipientSelect).not.toContainText(
      `${TEST_USERS.executive.firstName} ${TEST_USERS.executive.lastName}`
    );

    const reportOptions = await recipientSelect.locator('option').allTextContents();
    const normalizeOptions = (options: string[]) =>
      options
        .map((option) => option.trim())
        .filter((option) => option && !option.toLowerCase().includes('select a teammate'));

    expect(normalizeOptions(peerOptions)).not.toEqual(normalizeOptions(reportOptions));

    await recipientSelect.selectOption(emp1Match.id);

    const message = `Manager recognition ${Date.now()}`;
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
