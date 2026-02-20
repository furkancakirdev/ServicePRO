import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type CronBackupResponse = {
  success: boolean;
  silinenDosyaSayisi: number;
  kalanYedekSayisi: number;
  olusturulanYedekDosyasi: string;
};

type BackupApiItem = {
  dosyaAdi: string;
};

test('Automated backup scheduling', async ({ page }) => {
  await loginAsAdmin(page);

  const manuel1 = await page.request.post('/api/backup', { data: { tur: 'manuel' } });
  expect(manuel1.status()).toBe(201);

  const manuel2 = await page.request.post('/api/backup', { data: { tur: 'manuel' } });
  expect(manuel2.status()).toBe(201);

  const cronResponse = await page.request.post('/api/cron/backup', {
    data: {
      retentionGun: 0,
      minimumYedekSayisi: 1,
    },
  });
  expect(cronResponse.status()).toBe(200);
  const cronBody = (await cronResponse.json()) as CronBackupResponse;
  expect(cronBody.success).toBeTruthy();
  expect(cronBody.kalanYedekSayisi).toBe(1);
  expect(cronBody.silinenDosyaSayisi).toBeGreaterThanOrEqual(1);

  const listResponse = await page.request.get('/api/backup');
  expect(listResponse.status()).toBe(200);
  const yedekler = (await listResponse.json()) as BackupApiItem[];
  expect(yedekler.length).toBe(1);
  expect(yedekler[0].dosyaAdi).toBe(cronBody.olusturulanYedekDosyasi);
});
