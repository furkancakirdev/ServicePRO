import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type MigrationOzeti = {
  durumUpsertSayisi: number;
  konumUpsertSayisi: number;
  unvanUpsertSayisi: number;
  servisDurumEslestirilen: number;
  servisKonumEslestirilen: number;
  personelUnvanEslestirilen: number;
  eksikDurumAnahtarlari: string[];
  eksikKonumAnahtarlari: string[];
  eksikUnvanAnahtarlari: string[];
};

type AnahtarKaydi = {
  key: string;
};

test.setTimeout(180000);

test('Migration from hard-coded to dynamic', async ({ page }) => {
  await loginAsAdmin(page);

  const migrationResponse = await page.request.post('/api/admin/dynamic-settings/migrate', {
    timeout: 120000,
  });
  expect(migrationResponse.status()).toBe(200);

  const ozet = (await migrationResponse.json()) as MigrationOzeti;
  expect(ozet.durumUpsertSayisi).toBeGreaterThanOrEqual(9);
  expect(ozet.konumUpsertSayisi).toBeGreaterThanOrEqual(3);
  expect(ozet.unvanUpsertSayisi).toBeGreaterThanOrEqual(4);
  expect(ozet.eksikDurumAnahtarlari).toEqual([]);
  expect(ozet.eksikKonumAnahtarlari).toEqual([]);
  expect(ozet.eksikUnvanAnahtarlari).toEqual([]);

  const durumlarResponse = await page.request.get('/api/admin/durumlar');
  expect(durumlarResponse.status()).toBe(200);
  const durumlar = (await durumlarResponse.json()) as AnahtarKaydi[];
  const durumKeySet = new Set(durumlar.map((durum) => durum.key));
  expect(durumKeySet.has('RANDEVU_VERILDI')).toBeTruthy();
  expect(durumKeySet.has('DEVAM_EDIYOR')).toBeTruthy();
  expect(durumKeySet.has('TAMAMLANDI')).toBeTruthy();

  const konumlarResponse = await page.request.get('/api/admin/konumlar');
  expect(konumlarResponse.status()).toBe(200);
  const konumlar = (await konumlarResponse.json()) as AnahtarKaydi[];
  const konumKeySet = new Set(konumlar.map((konum) => konum.key));
  expect(konumKeySet.has('YATMARIN')).toBeTruthy();
  expect(konumKeySet.has('NETSEL')).toBeTruthy();
  expect(konumKeySet.has('DIS_SERVIS')).toBeTruthy();

  const unvanlarResponse = await page.request.get('/api/admin/unvanlar');
  expect(unvanlarResponse.status()).toBe(200);
  const unvanlar = (await unvanlarResponse.json()) as AnahtarKaydi[];
  const unvanKeySet = new Set(unvanlar.map((unvan) => unvan.key));
  expect(unvanKeySet.has('USTA')).toBeTruthy();
  expect(unvanKeySet.has('CIRAK')).toBeTruthy();
  expect(unvanKeySet.has('YONETICI')).toBeTruthy();
  expect(unvanKeySet.has('OFIS')).toBeTruthy();
});
