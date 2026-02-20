import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type DictionaryRecord = {
  id: string;
  key: string;
  label: string;
};

async function getAuthHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function deleteDictionaryByKey(
  page: Page,
  listEndpoint: string,
  deleteEndpointPrefix: string,
  key: string
): Promise<void> {
  const headers = await getAuthHeaders(page);
  const listResponse = await page.request.get(listEndpoint, { headers });
  if (!listResponse.ok()) return;

  const rows = (await listResponse.json()) as DictionaryRecord[];
  const record = rows.find((row) => row.key === key);
  if (!record) return;

  await page.request.delete(`${deleteEndpointPrefix}/${record.id}`, { headers });
}

test('ADM-701: yeni durum/konum/blokaj nedeni adminden eklenir ve ekranlara yansir', async ({ page }) => {
  await loginAsAdmin(page);

  const suffix = `${Date.now()}`;
  const statusKey = `QA_STATUS_${suffix}`;
  const statusLabel = `QA Status ${suffix}`;
  const locationKey = `QA_LOCATION_${suffix}`;
  const locationLabel = `QA Location ${suffix}`;
  const blockingReasonKey = `QA_BLOCK_${suffix}`;
  const blockingReasonLabel = `QA Block ${suffix}`;

  try {
    const headers = await getAuthHeaders(page);
    const createStatusResponse = await page.request.post('/api/admin/durumlar', {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      data: {
        key: statusKey,
        label: statusLabel,
        description: 'ADM-701 test kaydi',
        color: '#2563eb',
        icon: 'flag',
        sirasi: 0,
        aktif: true,
      },
    });
    expect(createStatusResponse.ok()).toBeTruthy();

    const createLocationResponse = await page.request.post('/api/admin/konumlar', {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      data: {
        key: locationKey,
        label: locationLabel,
        adres: 'ADM-701 test adresi',
        telefon: null,
        sirasi: 0,
        aktif: true,
      },
    });
    expect(createLocationResponse.ok()).toBeTruthy();

    const createBlockingReasonResponse = await page.request.post('/api/admin/blokaj-nedenleri', {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      data: {
        key: blockingReasonKey,
        label: blockingReasonLabel,
        description: 'ADM-701 test kaydi',
        durumKey: statusKey,
        sirasi: 0,
        aktif: true,
      },
    });
    expect(createBlockingReasonResponse.ok()).toBeTruthy();

    await page.goto('/servisler/yeni');
    await expect(
      page.locator('select[name="durum"] option').filter({ hasText: statusLabel })
    ).toHaveCount(1);
    await expect(
      page.locator('select[name="yer"] option').filter({ hasText: locationLabel })
    ).toHaveCount(1);

    await page.goto('/servisler');
    await expect(page.getByRole('button', { name: 'Filtreler' })).toBeVisible();
    await page.getByRole('button', { name: 'Filtreler' }).click();
    await expect(page.getByText(locationLabel).first()).toBeVisible();
    await expect(page.getByText(blockingReasonLabel).first()).toBeVisible();
  } finally {
    await deleteDictionaryByKey(
      page,
      '/api/admin/blokaj-nedenleri',
      '/api/admin/blokaj-nedenleri',
      blockingReasonKey
    );
    await deleteDictionaryByKey(page, '/api/admin/konumlar', '/api/admin/konumlar', locationKey);
    await deleteDictionaryByKey(page, '/api/admin/durumlar', '/api/admin/durumlar', statusKey);
  }
});
