import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type HealthResponse = {
  status: string;
  db: string;
  version: string;
  time: string;
};

type ServiceListResponse = {
  services: Array<{
    id: string;
  }>;
};

async function ensureSmokeService(page: Page): Promise<string> {
  const listResponse = await page.request.get('/api/services?status=RANDEVU_VERILDI,DEVAM_EDIYOR&limit=1');
  expect(listResponse.ok()).toBeTruthy();
  const listBody = (await listResponse.json()) as ServiceListResponse;
  if (Array.isArray(listBody.services) && listBody.services.length > 0) {
    return listBody.services[0].id;
  }

  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const createResponse = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: 'SMOKE TEKNE',
      adres: 'Smoke Test Adres',
      yer: 'YATMARIN',
      servisAciklamasi: 'Smoke test detay acis kaydi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '10:00',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()) as { id: string };
  expect(created.id).toBeTruthy();
  return created.id;
}

test('Production deployment smoke', async ({ page, request }) => {
  const saglik = await request.get('/health');
  expect(saglik.status()).toBe(200);
  const body = (await saglik.json()) as HealthResponse;
  expect(body.status).toBe('ok');
  expect(body.db).toBe('ok');
  expect(body.version).toBeTruthy();
  expect(body.time).toBeTruthy();

  await loginAsAdmin(page);
  const smokeServiceId = await ensureSmokeService(page);

  await page.goto('/servisler?status=RANDEVU_VERILDI,DEVAM_EDIYOR');
  await expect(page).toHaveURL(/\/servisler/);
  await expect(page.locator('h1')).toContainText('Is Emirleri');

  const targetRow = page.getByTestId(`servis-row-${smokeServiceId}`);
  if ((await targetRow.count()) > 0) {
    await targetRow.first().click();
  } else {
    await page.goto(`/servisler/${smokeServiceId}`);
  }

  await expect(page).toHaveURL(/\/servisler\/[^/]+$/);
  await expect(page.locator('h1')).toBeVisible();
});
