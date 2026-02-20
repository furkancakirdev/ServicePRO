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

async function getAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();
  return token as string;
}

async function getActivePersonnel(page: Page): Promise<PersonelApiRow> {
  const response = await page.request.get('/api/personel?aktif=true');
  expect(response.ok()).toBeTruthy();
  const personeller = (await response.json()) as PersonelApiRow[];
  expect(personeller.length).toBeGreaterThan(0);
  return personeller[0];
}

async function createAndCompleteService(
  page: Page,
  personel: PersonelApiRow
): Promise<{ serviceId: string; boatName: string; summary: string }> {
  const token = await getAuthToken(page);
  const boatName = `INT802 BOAT ${Date.now()}`;
  const summary = 'Kapanis template otomasyon testi';
  const today = new Date().toISOString().slice(0, 10);

  const createResponse = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      boatName,
      tekneAdi: boatName,
      adres: 'YATMARIN',
      yer: 'YATMARIN',
      servisAciklamasi: summary,
      isTuru: 'PAKET',
      durum: 'DEVAM_EDIYOR',
      tarih: today,
      saat: '10:00',
      personeller: [{ personelId: personel.id, rol: 'SORUMLU' }],
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = (await createResponse.json()) as ServiceCreateResponse;
  expect(createBody.id).toBeTruthy();

  const completeResponse = await page.request.post(`/api/services/${createBody.id}/complete`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      personeller: [{ personelId: personel.id, rol: 'SORUMLU' }],
      bonusPersonelIds: [],
      kaliteKontrol: {
        uniteModelVar: true,
        uniteSaatiVar: true,
        uniteSeriNoVar: true,
        aciklamaYeterli: true,
        adamSaatVar: true,
        fotograflarVar: true,
      },
      zorlukOverride: 'RUTIN',
    },
  });

  expect(completeResponse.ok()).toBeTruthy();
  return { serviceId: createBody.id, boatName, summary };
}

test('Kapanis sonrasi WhatsApp sablonu secili servisle metin uretiyor', async ({ page }) => {
  await loginAsAdmin(page);
  const personel = await getActivePersonnel(page);
  const { serviceId, boatName, summary } = await createAndCompleteService(page, personel);

  await page.goto(`/raporlar/whatsapp?serviceId=${serviceId}`);
  await expect(page).toHaveURL(new RegExp(`/raporlar/whatsapp\\?serviceId=${serviceId}`));
  await expect(page.getByRole('heading', { name: 'WhatsApp Teknik Ekip Sablonlari' })).toBeVisible();
  await expect(page.getByTestId('whatsapp-template-editor')).toBeVisible();

  const serviceSelect = page.getByTestId('whatsapp-template-service-select');
  await expect(serviceSelect).toHaveValue(serviceId, { timeout: 20_000 });

  const preview = page.getByTestId('whatsapp-template-preview');
  await expect(preview).toContainText(boatName);
  await expect(preview).toContainText(summary);
  await expect(preview).toContainText(personel.ad);

  const templateInput = page.getByTestId('whatsapp-template-input');
  await templateInput.fill('Tekne={{boat}} / Teknik={{technician}} / Ozet={{summary}}');

  await expect(preview).toContainText(`Tekne=${boatName}`);
  await expect(preview).toContainText(`Teknik=${personel.ad}`);
  await expect(preview).toContainText(`Ozet=${summary}`);
});
