import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
  tekneId?: string;
};

type BoatApiRow = {
  id: string;
  ad: string;
};

async function createBoatService(page: Page, boatName: string): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const response = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      boatName,
      tekneAdi: boatName,
      adres: 'YATMARIN',
      yer: 'YATMARIN',
      servisAciklamasi: 'Boat profile flow test servisi',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '11:00',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

async function findBoatId(page: Page, boatName: string): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  const response = await page.request.get('/api/tekneler', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  expect(response.ok()).toBeTruthy();
  const boats = (await response.json()) as BoatApiRow[];
  const target = boats.find((boat) => boat.ad === boatName);
  expect(target?.id).toBeTruthy();
  return target!.id;
}

test('Tekneler listesi ve profilinden is emri detayina tek tik gecis', async ({ page }) => {
  await loginAsAdmin(page);
  const boatName = `BOAT TEST ${Date.now()}`;
  const serviceId = await createBoatService(page, boatName);
  const boatId = await findBoatId(page, boatName);

  await page.goto(`/tekneler?q=${encodeURIComponent(boatName)}`);
  await expect(page).toHaveURL(/\/tekneler/);
  await expect(page.getByRole('heading', { name: 'Tekneler' })).toBeVisible();
  await expect(page.getByTestId(`tekne-row-${boatId}`)).toBeVisible();

  await page.getByTestId(`tekne-open-profile-${boatId}`).click();
  await expect(page).toHaveURL(new RegExp(`/tekneler/${boatId}`));
  await expect(page.getByTestId('tekne-summary-card')).toBeVisible();
  await expect(page.getByTestId('tekne-open-work-orders')).toBeVisible();

  const openServiceLink = page.getByTestId(`tekne-open-service-link-${serviceId}`);
  await expect(openServiceLink).toBeVisible();
  await openServiceLink.click();

  await expect(page).toHaveURL(new RegExp(`/servisler/${serviceId}$`));
  await expect(page.locator('h1')).toBeVisible();
});
