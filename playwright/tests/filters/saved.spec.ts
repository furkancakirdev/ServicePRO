import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServisResponse = {
  id: string;
};

async function servisOlustur(page: Page, tekneAdi: string): Promise<string> {
  const response = await page.request.post('/api/services', {
    data: {
      tekneAdi,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'Saved filter testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '11:00',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServisResponse;
  return body.id;
}

test('Saved filters', async ({ page }) => {
  await loginAsAdmin(page);

  const zamanDamgasi = Date.now();
  const tekneA = `SAVED_A_${zamanDamgasi}`;
  const tekneB = `SAVED_B_${zamanDamgasi}`;
  const kayitAdi = `Bugunun Isleri ${zamanDamgasi}`;
  const silinecekServisIdleri: string[] = [];

  try {
    const servisAId = await servisOlustur(page, tekneA);
    const servisBId = await servisOlustur(page, tekneB);
    silinecekServisIdleri.push(servisAId, servisBId);

    await page.goto('/servisler');

    const tablo = page.locator('[data-testid="servis-table-body"]');
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    await page.click('[data-testid="inline-filter-tekneAdi-trigger"]');
    await page.fill('[data-testid="inline-filter-tekneAdi-input"]', tekneA);
    await page.waitForTimeout(700);

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    await page.fill('[data-testid="saved-filter-name-input"]', kayitAdi);
    await page.click('[data-testid="saved-filter-save-button"]');

    const kayitSatiri = page.locator('[data-testid="saved-filter-item"]', { hasText: kayitAdi });
    await expect(kayitSatiri).toBeVisible();

    await page.click('[data-testid="inline-filter-clear-all-button"]');
    await page.waitForTimeout(500);
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    await kayitSatiri.locator('[data-testid="saved-filter-apply-button"]').click();
    await page.waitForTimeout(700);

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);
  } finally {
    for (const servisId of silinecekServisIdleri) {
      await page.request.delete(`/api/services/${servisId}`).catch(() => null);
    }
  }
});

