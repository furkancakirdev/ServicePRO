import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type DynamicSettingGetYaniti = {
  key: string;
  value: string;
  source: 'fallback' | 'database';
};

type DynamicSettingPutYaniti = {
  key: string;
  value: string;
  category: string;
};

test('Dynamic settings cache', async ({ page }) => {
  await loginAsAdmin(page);

  const anahtar = `test.dynamic.cache.${Date.now()}`;
  const varsayilanDeger = 'varsayilan-deger';

  const ilkGet = await page.request.get(
    `/api/admin/dynamic-settings?key=${encodeURIComponent(anahtar)}&fallback=${encodeURIComponent(varsayilanDeger)}`
  );
  expect(ilkGet.status()).toBe(200);

  const ilkBody = (await ilkGet.json()) as DynamicSettingGetYaniti;
  expect(ilkBody.key).toBe(anahtar);
  expect(ilkBody.value).toBe(varsayilanDeger);
  expect(ilkBody.source).toBe('fallback');

  const yeniDeger = `guncel-deger-${Date.now()}`;
  const putResponse = await page.request.put('/api/admin/dynamic-settings', {
    data: {
      key: anahtar,
      value: yeniDeger,
      category: 'test',
      description: 'Playwright cache invalidation testi',
    },
  });
  expect(putResponse.status()).toBe(200);

  const putBody = (await putResponse.json()) as DynamicSettingPutYaniti;
  expect(putBody.key).toBe(anahtar);
  expect(putBody.value).toBe(yeniDeger);
  expect(putBody.category).toBe('test');

  const ikinciGet = await page.request.get(
    `/api/admin/dynamic-settings?key=${encodeURIComponent(anahtar)}&fallback=${encodeURIComponent(varsayilanDeger)}`
  );
  expect(ikinciGet.status()).toBe(200);

  const ikinciBody = (await ikinciGet.json()) as DynamicSettingGetYaniti;
  expect(ikinciBody.key).toBe(anahtar);
  expect(ikinciBody.value).toBe(yeniDeger);
  expect(ikinciBody.source).toBe('database');
});
