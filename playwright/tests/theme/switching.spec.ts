import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Theme switching', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeFalsy();

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  await page.reload();

  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('servicepro-theme')))
    .toBe('dark');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();
});

