import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { TEST_USERS } from '../constants/users';

test('homepage loads and shows primary call to action', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /reward teams everywhere with local care/i })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /start free/i })).toBeVisible();
});

test('employee can send recognition from the modal', async ({ page }, testInfo) => {
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

  await page.getByTestId('send-recognition-cta').click();

  await expect(page.getByRole('dialog')).toBeVisible();

  const recipientsResponse = await recipientsResponsePromise;
  const recipientsData = await recipientsResponse.json();
  const match = recipientsData?.recipients?.find(
    (recipient: { first_name: string; last_name: string; id: string }) =>
      recipient.first_name === TEST_USERS.employee2.firstName &&
      recipient.last_name === TEST_USERS.employee2.lastName
  );

  if (!match?.id) {
    throw new Error('Expected to find employee2 in recognition recipients.');
  }

  await page.getByTestId('recognition-recipient').selectOption(match.id);
  await page.getByLabel('Recognition type').selectOption('spot_award');

  const message = `Smoke recognition ${Date.now()}`;
  await page.getByTestId('recognition-message').fill(message);
  await page.getByTestId('recognition-value-customer-focus').click();

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
