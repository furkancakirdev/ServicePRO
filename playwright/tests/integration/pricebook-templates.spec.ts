import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type CreatedCategory = {
  id: string;
};

type CreatedItem = {
  id: string;
  ad: string;
};

type CreatedTemplate = {
  id: string;
};

type CreatedJob = {
  id: string;
};

function toTrDateTimeInput(value: Date): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);

  return formatted.replace(' ', 'T');
}

async function getToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();
  return token!;
}

async function createCategory(page: Page, token: string, name: string): Promise<CreatedCategory> {
  const response = await page.request.post('/api/pricebook/categories', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      ad: name,
      sira: 0,
      aktif: true,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CreatedCategory;
}

async function createItem(
  page: Page,
  token: string,
  categoryId: string,
  name: string,
  code: string
): Promise<CreatedItem> {
  const response = await page.request.post('/api/pricebook/items', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tip: 'HIZMET',
      kod: code,
      ad: name,
      birim: 'adet',
      varsayilanFiyat: 1500,
      categoryId,
      aktif: true,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CreatedItem;
}

async function createTemplate(
  page: Page,
  token: string,
  name: string,
  itemId: string,
  itemName: string
): Promise<CreatedTemplate> {
  const response = await page.request.post('/api/templates/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      ad: name,
      aktif: true,
      defaultStatus: 'RANDEVU_VERILDI',
      items: [
        {
          pricebookItemId: itemId,
          ad: itemName,
          miktar: 1,
          birimFiyat: 1500,
          sira: 0,
        },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CreatedTemplate;
}

async function createJob(page: Page, token: string, boatName: string): Promise<CreatedJob> {
  const start = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const response = await page.request.post('/api/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: boatName,
      adres: 'Yatmarin',
      yer: 'YATMARIN',
      servisAciklamasi: 'Pricebook estimate e2e kaydi',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      firstAppointment: {
        baslangicAt: toTrDateTimeInput(start),
        bitisAt: toTrDateTimeInput(end),
        personelId: null,
        status: 'PLANLANDI',
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CreatedJob;
}

test('Pricebook item + template, job estimate tabinda line item akisini calistirir', async ({ page }) => {
  await loginAsAdmin(page);
  const token = await getToken(page);

  const suffix = Date.now();
  const categoryName = `E2E CATEGORY ${suffix}`;
  const itemName = `E2E ITEM ${suffix}`;
  const templateName = `E2E TEMPLATE ${suffix}`;
  const itemCode = `E2E-${suffix}`;
  const boatName = `E2E BOAT ${suffix}`;

  const category = await createCategory(page, token, categoryName);
  const item = await createItem(page, token, category.id, itemName, itemCode);
  const template = await createTemplate(page, token, templateName, item.id, itemName);
  const job = await createJob(page, token, boatName);

  try {
    await page.goto(`/jobs/${job.id}?tab=estimate`);
    await expect(page.getByTestId('estimate-tab')).toBeVisible();

    await page.getByTestId('estimate-template-select').selectOption(template.id);
    await page.getByTestId('estimate-apply-template').click();
    await expect(page.getByText(/Template uygulandi/i)).toBeVisible();

    const firstRow = page.locator('[data-testid^="estimate-line-item-row-"]').first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow).toContainText(itemName);

    await page.getByTestId('estimate-pricebook-search').fill(itemCode);
    await page.getByTestId('estimate-pricebook-item-select').selectOption(item.id);
    await page.getByTestId('estimate-new-miktar').fill('2');
    await page.getByTestId('estimate-new-birim-fiyat').fill('1500');
    await page.getByTestId('estimate-add-line-item').click();
    await expect(page.getByText(/Line item eklendi/i)).toBeVisible();

    const rows = page.locator('[data-testid^="estimate-line-item-row-"]');
    await expect(rows).toHaveCount(2);

    const editableRow = rows.first();
    await editableRow.locator('input[type="number"]').first().fill('3');
    await editableRow.getByRole('button', { name: /Guncelle/i }).click();
    await expect(page.getByText(/Line item guncellendi/i)).toBeVisible();

    await editableRow.getByRole('button', { name: /^Sil$/i }).click();
    await expect(page.getByText(/Line item silindi/i)).toBeVisible();
  } finally {
    await page.request.delete(`/api/services/${job.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    await page.request.put(`/api/templates/jobs/${template.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        aktif: false,
      },
    }).catch(() => null);

    await page.request.put(`/api/pricebook/items/${item.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        aktif: false,
      },
    }).catch(() => null);

    await page.request.put(`/api/pricebook/categories/${category.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        aktif: false,
      },
    }).catch(() => null);
  }
});
