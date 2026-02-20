import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServisResponse = {
  id: string;
};

async function servisOlustur(page: Page, tekneAdi: string, durum: string): Promise<string> {
  const response = await page.request.post('/api/services', {
    data: {
      tekneAdi,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'Inline filtre testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '09:00',
      durum,
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServisResponse;
  return body.id;
}

test('Inline column filters', async ({ page }) => {
  await loginAsAdmin(page);

  const zamanDamgasi = Date.now();
  const tekneA = `INLINE_A_${zamanDamgasi}`;
  const tekneB = `INLINE_B_${zamanDamgasi}`;

  const silinecekServisIdleri: string[] = [];

  try {
    const servisAId = await servisOlustur(page, tekneA, 'RANDEVU_VERILDI');
    const servisBId = await servisOlustur(page, tekneB, 'PARCA_BEKLIYOR');
    silinecekServisIdleri.push(servisAId, servisBId);

    await page.goto('/servisler?durum=RANDEVU_VERILDI,PARCA_BEKLIYOR');

    const tablo = page.locator('[data-testid="servis-table-body"]');
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    await page.click('[data-testid="inline-filter-tekneAdi-trigger"]');
    await page.fill('[data-testid="inline-filter-tekneAdi-input"]', tekneA);
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    const tekneRozetiSil = page.locator('[data-testid="inline-filter-badge-remove-tekneAdi"]');
    await expect(tekneRozetiSil).toBeVisible();
    await tekneRozetiSil.click();
    await page.waitForTimeout(400);

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    await page.click('[data-testid="inline-filter-durum-trigger"]');
    await page.click('[data-testid="inline-filter-durum-option-PARCA_BEKLIYOR"]');
    await page.waitForTimeout(400);

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    await page.click('[data-testid="inline-filter-clear-all-button"]');
    await page.waitForTimeout(500);

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);
  } finally {
    for (const servisId of silinecekServisIdleri) {
      await page.request.delete(`/api/services/${servisId}`).catch(() => null);
    }
  }
});
