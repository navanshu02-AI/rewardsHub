import { expect, test } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');
const storageState = path.join(authDir, 'hr.json');
const employeeStorageState = path.join(authDir, 'employee.json');

test.describe('Admin rewards', () => {
  test.use({ storageState });

  test('hr admin can reach rewards admin page', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByTestId('nav-admin-menu').click();
    await page.getByTestId('nav-admin-rewards').click();

    await expect(page.getByRole('heading', { name: /admin rewards/i })).toBeVisible();
    await expect(page.getByTestId('create-reward-button')).toBeVisible();
  });

  test('admin creates reward and employee sees it in catalog', async ({ browser }) => {
    const rewardTitle = `Playwright Reward ${Date.now()}`;
    const rewardDescription = `Automation reward ${Date.now()}`;

    const adminContext = await browser.newContext({ storageState });
    const adminPage = await adminContext.newPage();

    await adminPage.goto('/admin/rewards');
    await adminPage.getByTestId('create-reward-button').click();

    await adminPage.getByLabel('Title').fill(rewardTitle);
    await adminPage.getByLabel('Description').fill(rewardDescription);
    await expect(adminPage.getByLabel('IN', { exact: true })).toBeChecked();
    await adminPage.getByLabel('Points required').fill('150');
    await adminPage.getByLabel('Availability').fill('12');
    await adminPage.getByLabel('Price (INR)').fill('1500');
    await adminPage.getByLabel('Price (USD)').fill('20');
    await adminPage.getByLabel('Price (EUR)').fill('18');

    const createResponsePromise = adminPage.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/rewards') && response.request().method() === 'POST'
    );
    await adminPage.getByRole('button', { name: /save reward/i }).click();
    await createResponsePromise;

    await expect(adminPage.getByText(rewardTitle, { exact: true })).toBeVisible();
    await adminContext.close();

    const employeeContext = await browser.newContext({ storageState: employeeStorageState });
    const employeePage = await employeeContext.newPage();
    const rewardsResponsePromise = employeePage.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/rewards') && response.request().method() === 'GET'
    );
    await employeePage.goto('/dashboard');
    await rewardsResponsePromise;

    await expect(employeePage.getByRole('heading', { name: /rewards catalog/i })).toBeVisible();
    await expect(employeePage.getByText(rewardTitle, { exact: true })).toBeVisible();
    await employeeContext.close();
  });
});
