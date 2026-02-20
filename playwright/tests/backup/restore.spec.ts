import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
  servisAciklamasi: string;
};

type ServiceListResponse = {
  services: Array<{
    id: string;
    servisAciklamasi: string;
  }>;
};

type BackupCreateResponse = {
  dosyaAdi: string;
};

type RestoreResponse = {
  kaynakDosya: string;
  restoreEdilenKayitSayisi: number;
};

test('Backup restore', async ({ page }) => {
  await loginAsAdmin(page);

  const benzersizEtiket = `restore-${Date.now()}`;

  const servisOlusturResponse = await page.request.post('/api/services', {
    data: {
      boatName: `Restore Tekne ${benzersizEtiket}`,
      tekneAdi: `Restore Tekne ${benzersizEtiket}`,
      adres: 'NETSEL MARINA',
      yer: 'NETSEL',
      servisAciklamasi: `Restore Test ${benzersizEtiket}`,
      irtibatKisi: 'Restore Test Kisi',
      telefon: '5550000000',
      durum: 'RANDEVU_VERILDI',
    },
  });
  expect(servisOlusturResponse.ok()).toBeTruthy();
  const yeniServis = (await servisOlusturResponse.json()) as ServiceCreateResponse;
  expect(yeniServis.id).toBeTruthy();

  const yedekResponse = await page.request.post('/api/yedekleme', {
    data: { tur: 'manuel' },
  });
  expect(yedekResponse.status()).toBe(201);
  const yedekBilgisi = (await yedekResponse.json()) as BackupCreateResponse;
  expect(yedekBilgisi.dosyaAdi).toContain('servicepro-');

  const servisSilResponse = await page.request.delete(`/api/services/${yeniServis.id}`);
  expect(servisSilResponse.ok()).toBeTruthy();

  const silmeSonrasiListeResponse = await page.request.get(
    `/api/services?arama=${encodeURIComponent(benzersizEtiket)}&limit=20`
  );
  expect(silmeSonrasiListeResponse.ok()).toBeTruthy();
  const silmeSonrasiListe = (await silmeSonrasiListeResponse.json()) as ServiceListResponse;
  const silinenServisHalaVar = silmeSonrasiListe.services.some(
    (servis) => servis.id === yeniServis.id
  );
  expect(silinenServisHalaVar).toBeFalsy();

  const restoreResponse = await page.request.post('/api/backup/restore', {
    data: { dosyaAdi: yedekBilgisi.dosyaAdi },
    timeout: 120_000,
  });
  const restoreBodyText = await restoreResponse.text();
  expect(restoreResponse.status(), `Restore response body: ${restoreBodyText}`).toBe(200);
  const restoreSonucu = JSON.parse(restoreBodyText) as RestoreResponse;
  expect(restoreSonucu.kaynakDosya).toBe(yedekBilgisi.dosyaAdi);
  expect(restoreSonucu.restoreEdilenKayitSayisi).toBeGreaterThan(0);

  const restoreSonrasiListeResponse = await page.request.get(
    `/api/services?arama=${encodeURIComponent(benzersizEtiket)}&limit=20`
  );
  expect(restoreSonrasiListeResponse.ok()).toBeTruthy();
  const restoreSonrasiListe = (await restoreSonrasiListeResponse.json()) as ServiceListResponse;
  const geriGelenServisVar = restoreSonrasiListe.services.some(
    (servis) =>
      servis.id === yeniServis.id ||
      servis.servisAciklamasi.includes(benzersizEtiket)
  );
  expect(geriGelenServisVar).toBeTruthy();
});
