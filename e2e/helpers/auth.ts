import { expect, type Page } from '@playwright/test';

interface LoginCredentials {
  email: string;
  password: string;
}

export async function loginAs(page: Page, { email, password }: LoginCredentials) {
  await page.goto('/auth');

  await page.getByTestId('auth-email').fill(email);
  await page.getByTestId('auth-password').fill(password);
  await page.getByTestId('auth-submit-login').click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
}
