import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type BackupApiItem = {
  id: string;
  dosyaAdi: string;
  kayitSayisi: number;
};

type DownloadedBackup = {
  version?: string;
  metadata?: {
    tables?: string[];
  };
};

test('Backup API endpoints', async ({ page }) => {
  await loginAsAdmin(page);

  const createResponse = await page.request.post('/api/backup', {
    data: { tur: 'manuel' },
  });
  expect(createResponse.status()).toBe(201);
  const olusanYedek = (await createResponse.json()) as BackupApiItem;
  expect(olusanYedek.dosyaAdi).toContain('servicepro-');
  expect(olusanYedek.kayitSayisi).toBeGreaterThan(0);

  const listResponse = await page.request.get('/api/backup');
  expect(listResponse.status()).toBe(200);
  const yedekListesi = (await listResponse.json()) as BackupApiItem[];
  expect(Array.isArray(yedekListesi)).toBeTruthy();
  expect(yedekListesi.some((yedek) => yedek.id === olusanYedek.id)).toBeTruthy();

  const listAliasResponse = await page.request.get('/api/backup/list');
  expect(listAliasResponse.status()).toBe(200);
  const aliasListe = (await listAliasResponse.json()) as BackupApiItem[];
  expect(aliasListe.some((yedek) => yedek.id === olusanYedek.id)).toBeTruthy();

  const downloadResponse = await page.request.get(
    `/api/backup/download?id=${encodeURIComponent(olusanYedek.id)}`
  );
  expect(downloadResponse.status()).toBe(200);
  expect(downloadResponse.headers()['content-type']).toContain('application/json');
  const indirilenHamIcerik = await downloadResponse.text();
  const indirilenYedek = JSON.parse(indirilenHamIcerik) as DownloadedBackup;
  expect(indirilenYedek.version).toBe('1.0');
  expect(indirilenYedek.metadata?.tables?.length ?? 0).toBeGreaterThan(0);
});
