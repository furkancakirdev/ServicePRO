import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServisYanit = {
  id: string;
  servisAciklamasi: string;
};

type ServisListeYanit = {
  services: ServisYanit[];
};

type YedekYanit = {
  dosyaAdi: string;
};

test('Backup restore workflow', async ({ page }) => {
  test.setTimeout(90000);
  await loginAsAdmin(page);

  const etiket = `INTEGRATION_BACKUP_${Date.now()}`;
  let servisId = '';

  try {
    const servisOlustur = await page.request.post('/api/services', {
      data: {
        tekneAdi: `Backup Tekne ${etiket}`,
        adres: 'NETSEL MARINA',
        yer: 'NETSEL',
        servisAciklamasi: `Backup Restore Test ${etiket}`,
        irtibatKisi: 'Integration Test',
        telefon: '5551112233',
        durum: 'RANDEVU_VERILDI',
      },
    });
    expect(servisOlustur.status()).toBe(201);
    const yeniServis = (await servisOlustur.json()) as ServisYanit;
    servisId = yeniServis.id;

    const yedekOlustur = await page.request.post('/api/yedekleme', {
      data: { tur: 'manuel' },
    });
    expect(yedekOlustur.status()).toBe(201);
    const yedek = (await yedekOlustur.json()) as YedekYanit;
    expect(yedek.dosyaAdi).toContain('servicepro-');

    const servisSil = await page.request.delete(`/api/services/${servisId}`);
    expect(servisSil.ok()).toBeTruthy();

    const silmeSonrasi = await page.request.get(
      `/api/services?arama=${encodeURIComponent(etiket)}&limit=25`
    );
    expect(silmeSonrasi.ok()).toBeTruthy();
    const silmeSonrasiBody = (await silmeSonrasi.json()) as ServisListeYanit;
    expect(silmeSonrasiBody.services.some((servis) => servis.id === servisId)).toBeFalsy();

    const restore = await page.request.post('/api/backup/restore', {
      data: { dosyaAdi: yedek.dosyaAdi },
    });
    const restoreRaw = await restore.text();
    expect(restore.status(), `Restore response body: ${restoreRaw}`).toBe(200);

    const restoreSonrasi = await page.request.get(
      `/api/services?arama=${encodeURIComponent(etiket)}&limit=25`
    );
    expect(restoreSonrasi.ok()).toBeTruthy();
    const restoreSonrasiBody = (await restoreSonrasi.json()) as ServisListeYanit;
    expect(
      restoreSonrasiBody.services.some(
        (servis) => servis.id === servisId || servis.servisAciklamasi.includes(etiket)
      )
    ).toBeTruthy();
  } finally {
    const kalanlar = await page.request.get(`/api/services?arama=${encodeURIComponent(etiket)}&limit=50`);
    if (kalanlar.ok()) {
      const body = (await kalanlar.json()) as ServisListeYanit;
      for (const servis of body.services) {
        await page.request.delete(`/api/services/${servis.id}`).catch(() => null);
      }
    }
  }
});
