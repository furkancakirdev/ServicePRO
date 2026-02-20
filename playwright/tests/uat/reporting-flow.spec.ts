import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Reporting workflow', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/raporlar/performans');
  await expect(page.getByText('Aylık Performans Raporu')).toBeVisible();

  await page.goto('/raporlar/rozetler');
  await expect(page.getByText('Rozet Kazananları')).toBeVisible();

  await page.goto('/raporlar/whatsapp');
  await expect(page.getByText('WhatsApp Teknik Ekip Sablonlari')).toBeVisible();
  await expect(page.getByTestId('whatsapp-template-editor')).toBeVisible();
});
