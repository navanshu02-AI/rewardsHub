import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');
const employeeStorageState = path.join(authDir, 'employee.json');

const waitForRewardsCurrency = (page: Page, currency: string) =>
  page.waitForResponse((response) => {
    if (!response.url().includes('/api/v1/rewards') || response.request().method() !== 'GET') {
      return false;
    }
    const url = new URL(response.url());
    return url.searchParams.get('currency') === currency;
  });

const waitForRecommendationsCurrency = (page: Page, currency: string) =>
  page.waitForResponse((response) => {
    if (!response.url().includes('/api/v1/recommendations') || response.request().method() !== 'GET') {
      return false;
    }
    const url = new URL(response.url());
    return url.searchParams.get('currency') === currency;
  });

test.describe('Dashboard currency updates', () => {
  test('switching currency updates catalog and recommendations', async ({ browser }) => {
    const context = await browser.newContext({ storageState: employeeStorageState });
    const page = await context.newPage();

    const settingsResponse = await page.request.get('/api/v1/settings');
    const settingsData = await settingsResponse.json();
    test.skip(!settingsData?.ai_enabled, 'AI recommendations are disabled for this environment.');

    await page.goto('/profile?tab=preferences');
    const currencySelector = page.getByText('Currency').locator('..').getByRole('combobox');
    await currencySelector.selectOption('EUR');

    const eurRewardsPromise = waitForRewardsCurrency(page, 'EUR');
    const eurRecommendationsPromise = waitForRecommendationsCurrency(page, 'EUR');

    await page.goto('/dashboard');
    await eurRewardsPromise;
    await eurRecommendationsPromise;

    const catalogSection = page.getByRole('heading', { name: /rewards catalog/i }).locator('..').locator('..');
    await expect(catalogSection.getByText(/€\s?\d/)).toBeVisible();

    const recommendationsSection = page
      .getByRole('heading', { name: /Recommendations/i })
      .locator('..')
      .locator('..');
    await expect(recommendationsSection.getByText(/€\s?\d/)).toBeVisible();

    await context.close();
  });
});
