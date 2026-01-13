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

    await page.getByTestId('send-recognition-cta').click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const recipientsResponse = await recipientsResponsePromise;
    const recipientsData = await recipientsResponse.json();

    const recipients = recipientsData?.recipients ?? [];
    const emp1Match = recipients.find(
      (recipient: { first_name: string; last_name: string; id: string }) =>
        recipient.first_name === TEST_USERS.employee1.firstName &&
        recipient.last_name === TEST_USERS.employee1.lastName
    );
    const emp2Match = recipients.find(
      (recipient: { first_name: string; last_name: string; id: string }) =>
        recipient.first_name === TEST_USERS.employee2.firstName &&
        recipient.last_name === TEST_USERS.employee2.lastName
    );

    if (!emp1Match || !emp2Match) {
      throw new Error('Expected emp1 and emp2 to appear in recognition recipients.');
    }

    const recipientSelect = page.getByTestId('recognition-recipient');

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

  test('manager sends recognition to multiple direct reports', async ({ page }, testInfo) => {
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

    await page.getByTestId('send-recognition-cta').click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const recipientsResponse = await recipientsResponsePromise;
    const recipientsData = await recipientsResponse.json();

    const recipients = recipientsData?.recipients ?? [];
    if (recipients.length < 2) {
      throw new Error('Expected at least two recipients to run multi-select test.');
    }

    const recipientSelect = page.getByTestId('recognition-recipient');
    const selectedIds = recipients.slice(0, 2).map((recipient: { id: string }) => recipient.id);

    await recipientSelect.selectOption(selectedIds);

    const message = `Multi-recipient recognition ${Date.now()}`;
    await page.getByTestId('recognition-message').fill(message);

    await page.getByTestId('recognition-value-customer-focus').click();
    await page.getByTestId('recognition-value-ownership').click();

    const submitResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/recognitions') && response.request().method() === 'POST'
    );

    await page.getByTestId('recognition-submit').click();
    const submitResponse = await submitResponsePromise;
    const payload = submitResponse.request().postDataJSON();

    expect(payload.to_user_ids).toEqual(selectedIds);
    expect(payload).not.toHaveProperty('to_user_id');
  });
});
