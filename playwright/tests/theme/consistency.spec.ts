import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Component consistency', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  await page.click('[data-testid="inline-filter-tekneAdi-trigger"]');
  const inlineFilterContent = page.locator('[data-testid="inline-filter-tekneAdi-content"]');
  await expect(inlineFilterContent).toBeVisible();
  await expect(inlineFilterContent).toHaveClass(/bg-popover/);
  await expect(inlineFilterContent).not.toHaveClass(/slate-/);

  const inlineFilterInput = page.locator('[data-testid="inline-filter-tekneAdi-input"]');
  await expect(inlineFilterInput).not.toHaveClass(/bg-slate/);

  await page.keyboard.press('Escape');

  await page.goto('/');
  await page.click('.user-menu-trigger');
  const headerUserMenu = page.locator('[data-testid="header-user-menu-content"]');
  await expect(headerUserMenu).toBeVisible();
  await expect(headerUserMenu).toHaveClass(/bg-popover/);
  await expect(headerUserMenu).not.toHaveClass(/slate-/);

  await page.keyboard.press('Escape');

  await page.click('[data-testid="sidebar-user-menu-trigger"]');
  const sidebarUserMenu = page.locator('[data-testid="sidebar-user-menu-content"]');
  await expect(sidebarUserMenu).toBeVisible();
  await expect(sidebarUserMenu).toHaveClass(/bg-popover/);
  await expect(sidebarUserMenu).not.toHaveClass(/slate-/);
});
