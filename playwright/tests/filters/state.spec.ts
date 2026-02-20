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
      servisAciklamasi: 'Filter state testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '10:00',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServisResponse;
  return body.id;
}

test('Filter state persistence', async ({ page, context }) => {
  await loginAsAdmin(page);

  const zamanDamgasi = Date.now();
  const tekneA = `STATE_A_${zamanDamgasi}`;
  const tekneB = `STATE_B_${zamanDamgasi}`;
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

    await expect.poll(() => page.url()).toContain(`search=${encodeURIComponent(tekneA)}`);

    const localStorageFiltre = await page.evaluate(() =>
      window.localStorage.getItem('servisler:filter-state:v1')
    );
    expect(localStorageFiltre).toContain(tekneA);

    await page.reload();
    await expect(tablo).toContainText(tekneA);
    await expect(tablo).not.toContainText(tekneB);

    const filtreliUrl = page.url();
    const yeniSekme = await context.newPage();
    await yeniSekme.goto(filtreliUrl);
    await expect(yeniSekme.locator('[data-testid="servis-table-body"]')).toContainText(tekneA);
    await expect(yeniSekme.locator('[data-testid="servis-table-body"]')).not.toContainText(tekneB);
    await yeniSekme.close();
  } finally {
    for (const servisId of silinecekServisIdleri) {
      await page.request.delete(`/api/services/${servisId}`).catch(() => null);
    }
  }
});

