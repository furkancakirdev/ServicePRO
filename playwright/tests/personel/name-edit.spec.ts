import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type PersonelKaydi = {
  id: string;
  ad: string;
};

test('Personel name editing', async ({ page }) => {
  await loginAsAdmin(page);

  const listeResponse = await page.request.get('/api/personel');
  expect(listeResponse.ok()).toBeTruthy();
  const personeller = (await listeResponse.json()) as PersonelKaydi[];
  expect(personeller.length).toBeGreaterThan(0);

  const hedefPersonel = personeller[0];
  const oncekiAd = hedefPersonel.ad;
  const yeniAd = `Test Personel ${Date.now()}`;

  try {
    await page.goto(`/personel/${hedefPersonel.id}/duzenle`);

    const adInput = page.locator('[data-testid="personel-ad-input"]');
    await expect(adInput).toBeVisible();
    await adInput.fill(yeniAd);

    await page.click('[data-testid="personel-kaydet-button"]');
    await expect(page.locator('[data-testid="personel-form-success"]')).toContainText(
      'Personel bilgileri guncellendi.'
    );

    await expect(page.locator('[data-testid="personel-baslik"]')).toContainText(yeniAd);
    await expect(adInput).toHaveValue(yeniAd);

    const detayResponse = await page.request.get(`/api/personel/${hedefPersonel.id}`);
    expect(detayResponse.ok()).toBeTruthy();
    const detay = (await detayResponse.json()) as PersonelKaydi;
    expect(detay.ad).toBe(yeniAd);
  } finally {
    await page.request.put(`/api/personel/${hedefPersonel.id}`, {
      data: { ad: oncekiAd },
      headers: { Authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('token'))}` },
    });
  }
});
