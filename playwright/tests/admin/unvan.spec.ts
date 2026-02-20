import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Personel unvan management CRUD', async ({ page }) => {
  await loginAsAdmin(page);

  const key = `UNVAN_${Date.now().toString().slice(-6)}`;
  const ilkLabel = 'Test Unvan';
  const guncelLabel = 'Test Unvan Guncel';

  await page.goto('/ayarlar/unvanlar');
  await expect(page).toHaveURL(/\/ayarlar\/unvanlar/);

  await page.click('[data-testid="unvan-create-button"]');
  await page.fill('[data-testid="unvan-key-input"]', key);
  await page.fill('[data-testid="unvan-label-input"]', ilkLabel);
  await page.fill('[data-testid="unvan-puan-carpani-input"]', '1.25');
  await page.click('[data-testid="unvan-save-button"]');

  const tablo = page.locator('[data-testid="unvan-list-table"]');
  await expect(tablo).toContainText(key);
  await expect(tablo).toContainText(ilkLabel);

  await page.click(`[data-testid="unvan-edit-button-${key}"]`);
  await page.fill('[data-testid="unvan-label-input"]', guncelLabel);
  await page.fill('[data-testid="unvan-puan-carpani-input"]', '1.40');
  await page.click('[data-testid="unvan-save-button"]');

  await expect(tablo).toContainText(guncelLabel);
  await expect(tablo).toContainText('1.4');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.click(`[data-testid="unvan-delete-button-${key}"]`);

  await expect(tablo).not.toContainText(key);
});
