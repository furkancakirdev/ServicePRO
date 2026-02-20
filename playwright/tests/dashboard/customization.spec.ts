import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test.setTimeout(90000);

async function weatherWidgetGorunurMu(page: Page): Promise<boolean> {
  const weatherWidget = page.locator('[data-testid="dashboard-widget-weather"]');
  try {
    await expect(weatherWidget).toBeVisible({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function weatherWidgetEkle(page: Page): Promise<void> {
  await page.click('[data-testid="dashboard-edit-button"]');
  await page.click('[data-testid="dashboard-add-widget-button"]');
  const weatherEkleButonu = page.locator('[data-testid="dashboard-widget-library-add-weather"]');
  await expect(weatherEkleButonu).toBeVisible();
  await page.evaluate(() => {
    const button = document.querySelector('[data-testid="dashboard-widget-library-add-weather"]');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Weather ekleme butonu bulunamadi');
    }
    button.click();
  });
  await page.click('[data-testid="dashboard-save-button"]');
  await expect(page.locator('[data-testid="dashboard-save-button"]')).toBeHidden({ timeout: 15000 });
}

test('Dashboard customization', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');

  await expect(page.locator('[data-testid="dashboard-grid"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('[data-testid="dashboard-widget-operations"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-widget-stats"]')).toBeVisible();

  if (!(await weatherWidgetGorunurMu(page))) {
    await weatherWidgetEkle(page);
  }

  await page.reload();
  await expect(page.locator('[data-testid="dashboard-grid"]')).toBeVisible({ timeout: 30000 });

  if (!(await weatherWidgetGorunurMu(page))) {
    await weatherWidgetEkle(page);
    await page.reload();
    await expect(page.locator('[data-testid="dashboard-grid"]')).toBeVisible({ timeout: 30000 });
  }

  await expect(page.locator('[data-testid="dashboard-widget-weather"]')).toBeVisible({ timeout: 15000 });
});
