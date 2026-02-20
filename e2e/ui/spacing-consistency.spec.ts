import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

test('card padding tutarli olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="dashboard-grid-container"]', { timeout: 15000 });

  // Check CardContent padding - Grand Maritime uses p-6 in CardContent
  const cardElement = page.locator('.surface-panel, [class*="p-6"]').first();

  await expect(cardElement).toBeVisible();

  // Verify padding value
  const paddingValue = await cardElement.evaluate(el => {
    const stil = window.getComputedStyle(el);
    return stil.paddingTop;
  });

  // p-6 should be 24px (1.5rem)
  expect(paddingValue).toBe('24px');
});
