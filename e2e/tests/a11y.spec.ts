import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { loginAs } from '../helpers/auth';
import { TEST_USERS } from '../constants/users';

const SEVERE_IMPACTS = new Set(['critical', 'serious']);

const formatA11yViolations = (violations: { id: string; impact?: string | null; help: string; nodes: { target: string[]; failureSummary?: string | null }[] }[]) => {
  if (violations.length === 0) {
    return '';
  }

  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => {
          const summary = node.failureSummary ? ` (${node.failureSummary})` : '';
          return `  - ${node.target.join(', ')}${summary}`;
        })
        .join('\n');
      return `* ${violation.id} [${violation.impact ?? 'unknown'}] - ${violation.help}\n${targets}`;
    })
    .join('\n');
};

const runA11yScan = async (page: Page, context: string) => {
  const results = await new AxeBuilder({ page }).analyze();
  const severeViolations = results.violations.filter((violation) => violation.impact && SEVERE_IMPACTS.has(violation.impact));

  expect(
    severeViolations,
    `Serious/critical accessibility violations in ${context}:\n${formatA11yViolations(severeViolations)}`
  ).toEqual([]);
};

test.describe('accessibility checks', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('auth page', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.getByTestId('auth-email')).toBeVisible();

    await runA11yScan(page, 'auth page');
  });

  test('dashboard (logged in)', async ({ page }) => {
    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await runA11yScan(page, 'dashboard');
  });

  test('recognition modal open state', async ({ page }) => {
    await loginAs(page, {
      email: TEST_USERS.employee1.email,
      password: TEST_USERS.employee1.password
    });

    await page.getByTestId('recognition-open').click();
    await expect(page.getByRole('heading', { name: /celebrate a teammate/i })).toBeVisible();

    await runA11yScan(page, 'recognition modal');
  });
});
