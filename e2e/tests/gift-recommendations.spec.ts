import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');
const employeeStorageState = path.join(authDir, 'employee.json');

const waitForGiftRecommendationRequest = (page: Page) =>
  page.waitForRequest((request) => {
    if (!request.url().includes('/api/v1/recommendations/gift/') || request.method() !== 'GET') {
      return false;
    }
    return true;
  });

test.describe('Gift recommendations', () => {
  test('gift recommendations include region and currency', async ({ browser }) => {
    const context = await browser.newContext({ storageState: employeeStorageState });
    const page = await context.newPage();

    const settingsResponse = await page.request.get('/api/v1/settings');
    const settingsData = await settingsResponse.json();
    test.skip(!settingsData?.ai_enabled, 'AI recommendations are disabled for this environment.');

    const recipientsResponse = await page.request.get('/api/v1/recognitions/recipients');
    const recipientsData = await recipientsResponse.json();
    const recipients = recipientsData?.global?.recipients ?? [];
    test.skip(!recipients.length, 'No available recipients for gift recommendations.');

    await page.goto('/dashboard');
    const recipientSelect = page.getByTestId('gift-recipient');
    await expect(recipientSelect).toBeVisible();
    await recipientSelect.selectOption(recipients[0].id);

    const requestPromise = waitForGiftRecommendationRequest(page);
    await page.getByTestId('gift-recommendations-submit').click();
    const request = await requestPromise;

    const requestUrl = new URL(request.url());
    expect(requestUrl.searchParams.get('region')).toBeTruthy();
    expect(requestUrl.searchParams.get('currency')).toBeTruthy();
    expect(requestUrl.searchParams.get('budget_min')).toBeTruthy();
    expect(requestUrl.searchParams.get('budget_max')).toBeTruthy();

    await context.close();
  });
});
