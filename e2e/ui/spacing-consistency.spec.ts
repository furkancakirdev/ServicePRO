import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

test('card padding tutarli olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait for content to load
  await page.waitForSelector('main', { timeout: 15000 });

  // Check p-6 class elements (Tailwind padding-6 = 24px)
  const p6Elements = await page.locator('.p-6').first();

  await expect(p6Elements).toBeVisible();

  // Verify padding value
  const paddingValue = await p6Elements.evaluate(el => {
    const stil = window.getComputedStyle(el);
    return stil.paddingTop;
  });

  // p-6 should be 24px
  expect(paddingValue).toBe('24px');
});
