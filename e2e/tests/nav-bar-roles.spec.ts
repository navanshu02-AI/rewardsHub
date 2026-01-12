import { expect, test } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(__dirname, '..', '.auth');

const storageStates = {
  employee: path.join(authDir, 'employee.json'),
  manager: path.join(authDir, 'manager.json'),
  executive: path.join(authDir, 'executive.json'),
  hrAdmin: path.join(authDir, 'hr.json')
};

test.describe('NavBar role links', () => {
  test.describe('employee', () => {
    test.use({ storageState: storageStates.employee });

    test('sees profile in the user menu', async ({ page }) => {
      await page.goto('/dashboard');

      await page.getByTestId('nav-user-menu').click();
      await expect(page.getByTestId('nav-profile')).toBeVisible();
    });

    test('does not see approvals, org chart, or all redemptions', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByTestId('nav-approvals')).toBeHidden();
      await expect(page.getByTestId('nav-org-chart')).toBeHidden();
      await expect(page.getByTestId('nav-all-redemptions')).toBeHidden();
    });
  });

  test.describe('manager', () => {
    test.use({ storageState: storageStates.manager });

    test('does not see approvals, org chart, or all redemptions', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByTestId('nav-approvals')).toBeHidden();
      await expect(page.getByTestId('nav-org-chart')).toBeHidden();
      await expect(page.getByTestId('nav-all-redemptions')).toBeHidden();
    });
  });

  test.describe('executive', () => {
    test.use({ storageState: storageStates.executive });

    test('sees all redemptions but not approvals or org chart', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByTestId('nav-all-redemptions')).toBeVisible();
      await expect(page.getByTestId('nav-approvals')).toBeHidden();
      await expect(page.getByTestId('nav-org-chart')).toBeHidden();
    });
  });

  test.describe('hr admin', () => {
    test.use({ storageState: storageStates.hrAdmin });

    test('sees approvals, org chart, and all redemptions', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByTestId('nav-approvals')).toBeVisible();
      await expect(page.getByTestId('nav-org-chart')).toBeVisible();
      await expect(page.getByTestId('nav-all-redemptions')).toBeVisible();
    });
  });
});
