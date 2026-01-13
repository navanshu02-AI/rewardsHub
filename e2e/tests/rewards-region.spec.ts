import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');
const adminStorageState = path.join(authDir, 'hr.json');
const employeeStorageState = path.join(authDir, 'employee.json');

const rewardByTitle = (page: Page, title: string) =>
  page.getByText(title, { exact: true });

const selectPrimaryRegion = async (page: Page, region: string) => {
  await page.goto('/profile?tab=preferences');
  const regionSelector = page.getByText('Primary region').locator('..').getByRole('combobox');
  await regionSelector.selectOption(region);
};

test.describe('Region availability in rewards catalog', () => {
  test('switching regions updates catalog availability', async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: adminStorageState });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/rewards');

    const seedButton = adminPage.getByTestId('seed-rewards-button');
    if (await seedButton.isVisible()) {
      const seedResponsePromise = adminPage.waitForResponse((response) =>
        response.url().includes('/api/v1/rewards/seed') && response.request().method() === 'POST'
      );
      await seedButton.click();
      await seedResponsePromise;
    }
    await adminContext.close();

    const employeeContext = await browser.newContext({ storageState: employeeStorageState });
    const employeePage = await employeeContext.newPage();

    await selectPrimaryRegion(employeePage, 'usa');
    const usRewardsResponse = employeePage.waitForResponse((response) =>
      response.url().includes('/api/v1/rewards') && response.request().method() === 'GET'
    );
    await employeePage.goto('/dashboard');
    await usRewardsResponse;
    await expect(rewardByTitle(employeePage, 'Starbucks USA Gift Card - $50')).toBeVisible();
    await expect(rewardByTitle(employeePage, 'Eurail Global Pass - 3 Days')).toHaveCount(0);

    await selectPrimaryRegion(employeePage, 'europe');
    const euRewardsResponse = employeePage.waitForResponse((response) =>
      response.url().includes('/api/v1/rewards') && response.request().method() === 'GET'
    );
    await employeePage.goto('/dashboard');
    await euRewardsResponse;
    await expect(rewardByTitle(employeePage, 'Eurail Global Pass - 3 Days')).toBeVisible();
    await expect(rewardByTitle(employeePage, 'Starbucks USA Gift Card - $50')).toHaveCount(0);

    await employeeContext.close();
  });
});
