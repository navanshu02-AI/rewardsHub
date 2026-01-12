import { test, expect } from '@playwright/test';

test('homepage loads and shows primary call to action', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /reward teams everywhere with local care/i })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /start free/i })).toBeVisible();
});
