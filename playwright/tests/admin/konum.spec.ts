import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Location management CRUD', async ({ page }) => {
  await loginAsAdmin(page);

  const key = `KONUM_${Date.now().toString().slice(-6)}`;
  const ilkLabel = 'Test Konum';
  const guncelLabel = 'Test Konum Guncel';

  await page.goto('/ayarlar/konumlar');
  await expect(page).toHaveURL(/\/ayarlar\/konumlar/);

  await page.click('[data-testid="konum-create-button"]');
  await page.fill('[data-testid="konum-key-input"]', key);
  await page.fill('[data-testid="konum-label-input"]', ilkLabel);
  await page.fill('[data-testid="konum-adres-input"]', 'Marmaris Marina No:1');
  await page.fill('[data-testid="konum-telefon-input"]', '+902521112233');
  await page.click('[data-testid="konum-save-button"]');

  const tablo = page.locator('[data-testid="konum-list-table"]');
  await expect(tablo).toContainText(key);
  await expect(tablo).toContainText(ilkLabel);

  await page.click(`[data-testid="konum-edit-button-${key}"]`);
  await page.fill('[data-testid="konum-label-input"]', guncelLabel);
  await page.click('[data-testid="konum-save-button"]');

  await expect(tablo).toContainText(guncelLabel);

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click(`[data-testid="konum-delete-button-${key}"]`);

  await expect(tablo).not.toContainText(key);
});
