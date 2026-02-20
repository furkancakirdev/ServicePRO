import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
};

type PersonelApiRow = {
  id: string;
  ad: string;
  aktif: boolean;
};

async function createPersonnelService(
  page: Page,
  boatName: string,
  personelId: string
): Promise<string> {
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
      servisAciklamasi: 'Personnel profile flow test servisi',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '10:30',
      personeller: [{ personelId, rol: 'SORUMLU' }],
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

async function findActivePersonnel(page: Page): Promise<PersonelApiRow> {
  const response = await page.request.get('/api/personel?aktif=true');
  expect(response.ok()).toBeTruthy();
  const personeller = (await response.json()) as PersonelApiRow[];
  expect(personeller.length).toBeGreaterThan(0);
  return personeller[0];
}

test('Personel listesi ve profilinden is emri detayina tek tik gecis', async ({ page }) => {
  await loginAsAdmin(page);
  const personel = await findActivePersonnel(page);

  const boatName = `TEAM TEST ${Date.now()}`;
  const serviceId = await createPersonnelService(page, boatName, personel.id);

  await page.goto(`/personel?q=${encodeURIComponent(personel.ad)}`);
  await expect(page).toHaveURL(/\/personel/);
  await expect(page.getByRole('heading', { name: 'Personel' })).toBeVisible();
  await expect(page.getByTestId(`personel-row-${personel.id}`)).toBeVisible();

  await page.getByTestId(`personel-open-profile-${personel.id}`).click();
  await expect(page).toHaveURL(new RegExp(`/personel/${personel.id}`));
  await expect(page.getByTestId('personel-score-summary')).toBeVisible();
  await expect(page.getByTestId('personel-open-work-orders')).toBeVisible();

  const serviceLink = page.getByTestId(`personel-open-service-link-${serviceId}`);
  await expect(serviceLink).toBeVisible();
  await serviceLink.click();

  await expect(page).toHaveURL(new RegExp(`/servisler/${serviceId}$`));
  await expect(page.locator('h1')).toBeVisible();
});
