import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServisYanit = {
  id: string;
};

type ServisListeYanit = {
  services: Array<{
    id: string;
  }>;
};

test('Teknisyen daily workflow', async ({ page }) => {
  await loginAsAdmin(page);

  const etiket = `UAT_TEKNISYEN_${Date.now()}`;
  let servisId = '';

  try {
    const servisOlustur = await page.request.post('/api/services', {
      data: {
        tekneAdi: `Teknisyen Tekne ${etiket}`,
        adres: 'NETSEL MARINA',
        yer: 'NETSEL',
        servisAciklamasi: `Teknisyen gunluk is ${etiket}`,
        irtibatKisi: 'Teknisyen Kullanici',
        telefon: '5553331122',
        tarih: new Date().toISOString().slice(0, 10),
        saat: '09:30',
        durum: 'RANDEVU_VERILDI',
      },
    });

    expect(servisOlustur.status()).toBe(201);
    const yeniServis = (await servisOlustur.json()) as ServisYanit;
    servisId = yeniServis.id;

    const servisListe = await page.request.get(`/api/services?arama=${encodeURIComponent(etiket)}&limit=20`);
    expect(servisListe.ok()).toBeTruthy();
    const servisListeBody = (await servisListe.json()) as ServisListeYanit;
    expect(servisListeBody.services.some((servis) => servis.id === servisId)).toBeTruthy();

    await page.goto(`/servisler/${servisId}/duzenle`);
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[name="boatName"]')).toBeVisible({ timeout: 15000 });
  } finally {
    if (servisId) {
      await page.request.delete(`/api/services/${servisId}`).catch(() => null);
    }
  }
});

