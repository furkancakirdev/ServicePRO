import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Admin status workflow and servisler navigation', async ({ page }) => {
  await loginAsAdmin(page);

  const key = `INT_${Date.now().toString().slice(-6)}`;
  const label = `Entegrasyon Durum ${Date.now().toString().slice(-4)}`;
  const guncelLabel = `${label} Guncel`;

  try {
    await page.goto('/ayarlar/durumlar');

    await page.click('[data-testid="status-create-button"]');
    await page.fill('[data-testid="status-key-input"]', key);
    await page.fill('[data-testid="status-label-input"]', label);
    await page.fill('[data-testid="status-color-input"]', '#1E90FF');
    await page.fill('[data-testid="status-icon-input"]', 'anchor');
    await page.click('[data-testid="status-save-button"]');

    const statusTable = page.locator('[data-testid="status-list-table"]');
    await expect(statusTable).toContainText(key);
    await expect(statusTable).toContainText(label);

    await page.click(`[data-testid="status-edit-button-${key}"]`);
    await page.fill('[data-testid="status-label-input"]', guncelLabel);
    await page.click('[data-testid="status-save-button"]');
    await expect(statusTable).toContainText(guncelLabel);

    await page.goto('/servisler');
    await expect(page.locator('[data-testid="servis-table-body"]')).toBeVisible();
  } finally {
    await page.goto('/ayarlar/durumlar');
    const silButonu = page.locator(`[data-testid="status-delete-button-${key}"]`);
    if (await silButonu.count()) {
      page.once('dialog', async (dialog) => dialog.accept());
      await silButonu.first().click();
    }
  }
});
