import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Admin management workflow', async ({ page }) => {
  await loginAsAdmin(page);

  const key = `UAT_${Date.now().toString().slice(-6)}`;
  const ilkLabel = 'UAT Durumu';
  const guncelLabel = 'UAT Durumu Guncel';

  try {
    await page.goto('/ayarlar/durumlar');
    await expect(page).toHaveURL(/\/ayarlar\/durumlar/);

    await page.click('[data-testid="status-create-button"]');
    await page.fill('[data-testid="status-key-input"]', key);
    await page.fill('[data-testid="status-label-input"]', ilkLabel);
    await page.fill('[data-testid="status-color-input"]', '#0EA5E9');
    await page.fill('[data-testid="status-icon-input"]', 'anchor');
    await page.click('[data-testid="status-save-button"]');

    const statusTable = page.locator('[data-testid="status-list-table"]');
    await expect(statusTable).toContainText(key);
    await expect(statusTable).toContainText(ilkLabel);

    await page.click(`[data-testid="status-edit-button-${key}"]`);
    await page.fill('[data-testid="status-label-input"]', guncelLabel);
    await page.click('[data-testid="status-save-button"]');
    await expect(statusTable).toContainText(guncelLabel);

    await page.goto('/ayarlar/konumlar');
    await expect(page.getByText('Konum Yönetimi')).toBeVisible();

    await page.goto('/ayarlar/unvanlar');
    await expect(page.getByText('Personel Unvan Yönetimi')).toBeVisible();
  } finally {
    await page.goto('/ayarlar/durumlar');
    const deleteButton = page.locator(`[data-testid="status-delete-button-${key}"]`);
    if (await deleteButton.count()) {
      page.once('dialog', async (dialog) => dialog.accept());
      await deleteButton.first().click();
    }
  }
});
