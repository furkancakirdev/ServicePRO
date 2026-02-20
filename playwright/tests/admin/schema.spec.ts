import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type SchemaCheckResponse = {
  tables: Record<string, boolean>;
  columns: Record<string, boolean>;
  foreignKeys: Record<string, boolean>;
  indexes: Record<string, boolean>;
  allChecksPassed: boolean;
};

test('Database schema changes', async ({ page }) => {
  await loginAsAdmin(page);

  const response = await page.request.get('/api/admin/dynamic-settings/schema-check');
  expect(response.status()).toBe(200);

  const body = (await response.json()) as SchemaCheckResponse;
  expect(body.allChecksPassed).toBeTruthy();

  expect(body.tables.servis_durumlari).toBeTruthy();
  expect(body.tables.konumlar).toBeTruthy();
  expect(body.tables.personel_unvanlari).toBeTruthy();
  expect(body.tables.system_settings).toBeTruthy();

  expect(body.columns['personel.unvan_id']).toBeTruthy();
  expect(body.columns['servis.durum_id']).toBeTruthy();
  expect(body.columns['servis.konum_id']).toBeTruthy();

  expect(body.foreignKeys['personel.unvan_id->personel_unvanlari']).toBeTruthy();
  expect(body.foreignKeys['servis.durum_id->servis_durumlari']).toBeTruthy();
  expect(body.foreignKeys['servis.konum_id->konumlar']).toBeTruthy();
});
