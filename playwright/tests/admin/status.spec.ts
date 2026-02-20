import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Status management CRUD', async ({ page }) => {
  await loginAsAdmin(page);

  const key = `TEST_${Date.now().toString().slice(-6)}`;
  const ilkLabel = 'Test Durumu';
  const guncelLabel = 'Test Durumu Guncel';

  await page.goto('/ayarlar/durumlar');
  await expect(page).toHaveURL(/\/ayarlar\/durumlar/);

  await page.click('[data-testid="status-create-button"]');
  await page.fill('[data-testid="status-key-input"]', key);
  await page.fill('[data-testid="status-label-input"]', ilkLabel);
  await page.fill('[data-testid="status-color-input"]', '#FF0000');
  await page.fill('[data-testid="status-icon-input"]', 'alert-circle');
  await page.click('[data-testid="status-save-button"]');

  const tablo = page.locator('[data-testid="status-list-table"]');
  await expect(tablo).toContainText(key);
  await expect(tablo).toContainText(ilkLabel);

  await page.click(`[data-testid="status-edit-button-${key}"]`);
  await page.fill('[data-testid="status-label-input"]', guncelLabel);
  await page.click('[data-testid="status-save-button"]');

  await expect(tablo).toContainText(guncelLabel);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click(`[data-testid="status-delete-button-${key}"]`);

  await expect(tablo).not.toContainText(key);
});
