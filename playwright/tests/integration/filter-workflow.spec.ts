import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServisYanit = {
  id: string;
};

async function servisOlustur(page: Page, tekneAdi: string, durum: string): Promise<string> {
  const response = await page.request.post('/api/services', {
    data: {
      tekneAdi,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'Entegrasyon filtre testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '11:00',
      durum,
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServisYanit;
  return body.id;
}

test('Filter workflow with save and reload', async ({ page }) => {
  await loginAsAdmin(page);

  const zamanDamgasi = Date.now();
  const tekneA = `INT_FILTER_A_${zamanDamgasi}`;
  const tekneB = `INT_FILTER_B_${zamanDamgasi}`;
  const filtreAdi = `Int Filtre ${zamanDamgasi}`;
  const silinecekServisIdleri: string[] = [];

  try {
    const servisA = await servisOlustur(page, tekneA, 'RANDEVU_VERILDI');
    const servisB = await servisOlustur(page, tekneB, 'PARCA_BEKLIYOR');
    silinecekServisIdleri.push(servisA, servisB);

    await page.goto('/servisler?durum=RANDEVU_VERILDI,PARCA_BEKLIYOR');
    const tablo = page.locator('[data-testid="servis-table-body"]');
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    await page.click('[data-testid="inline-filter-tekneAdi-trigger"]');
    await page.fill('[data-testid="inline-filter-tekneAdi-input"]', tekneA);
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    await page.fill('[data-testid="saved-filter-name-input"]', filtreAdi);
    await page.click('[data-testid="saved-filter-save-button"]');
    await expect(page.locator('[data-testid="saved-filter-list"]')).toContainText(filtreAdi);

    await page.click('[data-testid="inline-filter-clear-all-button"]');
    await page.waitForTimeout(500);
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).toContainText(tekneB);

    const kayitSatiri = page
      .locator('[data-testid="saved-filter-item"]')
      .filter({ hasText: filtreAdi })
      .first();
    await kayitSatiri.locator('[data-testid="saved-filter-apply-button"]').click();

    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);
    await expect.poll(() => page.url()).toContain(`search=${encodeURIComponent(tekneA)}`);

    await page.reload();
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    await kayitSatiri.locator('[data-testid="saved-filter-delete-button"]').click();
  } finally {
    for (const servisId of silinecekServisIdleri) {
      await page.request.delete(`/api/services/${servisId}`).catch(() => null);
    }
  }
});
