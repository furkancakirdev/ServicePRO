import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
};

type ServiceDetailResponse = {
  id: string;
  durum: string;
  personeller: Array<{
    personelId: string;
    rol: 'SORUMLU' | 'DESTEK';
  }>;
};

type PersonnelApiRow = {
  id: string;
  ad: string;
  unvan: string;
};

async function createService(page: Page, boatName: string): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const response = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: boatName,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'WO-103 toplu islem testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '13:00',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

async function getService(page: Page, serviceId: string): Promise<ServiceDetailResponse> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const response = await page.request.get(`/api/services/${serviceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ServiceDetailResponse;
}

async function deleteService(page: Page, serviceId: string): Promise<void> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  if (!token) return;
  await page.request.delete(`/api/services/${serviceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

test('WO-103: en az 10 kayitta toplu durum ve toplu teknisyen atama', async ({ page }) => {
  await loginAsAdmin(page);

  const batchPrefix = `WO103-${Date.now()}`;
  const createdServiceIds: string[] = [];

  try {
    for (let index = 0; index < 10; index += 1) {
      const serviceId = await createService(page, `${batchPrefix}-TEKNE-${index + 1}`);
      createdServiceIds.push(serviceId);
    }

    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeTruthy();
    const personnelResponse = await page.request.get('/api/personel?aktif=true', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(personnelResponse.ok()).toBeTruthy();
    const personnelRows = (await personnelResponse.json()) as PersonnelApiRow[];
    expect(personnelRows.length).toBeGreaterThan(0);
    const selectedPersonnel = personnelRows[0];
    expect(selectedPersonnel?.id).toBeTruthy();
    expect(selectedPersonnel?.ad).toBeTruthy();

    await page.goto(`/servisler?q=${encodeURIComponent(batchPrefix)}&limit=100`);

    for (const serviceId of createdServiceIds) {
      const row = page.getByTestId(`servis-row-${serviceId}`);
      await expect(row).toBeVisible();
      await row.getByTestId(`bulk-select-row-${serviceId}`).click();
    }

    await expect(page.getByTestId('bulk-actions-bar')).toContainText('10 is secildi');

    await page.getByTestId('bulk-status-select').click();
    await page.getByRole('option', { name: /Par.*Bekliyor/i }).click();
    await page.getByTestId('bulk-status-apply').click();

    const bulkStatusApplyButton = page.getByTestId('bulk-status-apply');
    await expect
      .poll(
        async () => {
          const bulkBarVisible = await page.getByTestId('bulk-actions-bar').isVisible().catch(() => false);
          if (!bulkBarVisible) return 'hidden';
          return (await bulkStatusApplyButton.isEnabled()) ? 'enabled' : 'loading';
        },
        { timeout: 60000 }
      )
      .toMatch(/hidden|enabled/);

    for (const serviceId of createdServiceIds) {
      const service = await getService(page, serviceId);
      expect(service.durum).toBe('PARCA_BEKLIYOR');
    }

    await page.reload();

    for (const serviceId of createdServiceIds) {
      const row = page.getByTestId(`servis-row-${serviceId}`);
      await expect(row).toBeVisible();
      await row.getByTestId(`bulk-select-row-${serviceId}`).click();
    }

    await expect(page.getByTestId('bulk-actions-bar')).toContainText('10 is secildi');

    await page.getByTestId('bulk-personel-select').click();
    await page.getByRole('option', { name: new RegExp(selectedPersonnel.ad, 'i') }).first().click();
    await page.getByTestId('bulk-personel-role-select').click();
    await page.getByRole('option', { name: /Destek/i }).click();
    await page.getByTestId('bulk-assign-apply').click();

    const bulkAssignApplyButton = page.getByTestId('bulk-assign-apply');
    await expect
      .poll(
        async () => {
          const bulkBarVisible = await page.getByTestId('bulk-actions-bar').isVisible().catch(() => false);
          if (!bulkBarVisible) return 'hidden';
          return (await bulkAssignApplyButton.isEnabled()) ? 'enabled' : 'loading';
        },
        { timeout: 60000 }
      )
      .toMatch(/hidden|enabled/);

    for (const serviceId of createdServiceIds) {
      const service = await getService(page, serviceId);
      const assignment = service.personeller.find((item) => item.personelId === selectedPersonnel.id);
      expect(assignment).toBeTruthy();
      expect(assignment?.rol).toBe('DESTEK');
    }
  } finally {
    for (const serviceId of createdServiceIds) {
      await deleteService(page, serviceId);
    }
  }
});
