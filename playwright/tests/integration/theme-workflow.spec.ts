import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Theme workflow with persistence and tokenized overlays', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/servisler');

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  await page.click('[data-testid="inline-filter-tekneAdi-trigger"]');
  const inlineFilterContent = page.locator('[data-testid="inline-filter-tekneAdi-content"]');
  await expect(inlineFilterContent).toHaveClass(/bg-popover/);
  await expect(inlineFilterContent).not.toHaveClass(/slate-/);
  await page.keyboard.press('Escape');

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('servicepro-theme')))
    .toBe('dark');

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-light"]');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeFalsy();
});
