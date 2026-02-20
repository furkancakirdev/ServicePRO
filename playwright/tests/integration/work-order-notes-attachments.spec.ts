import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
};

type LoginResponse = {
  token: string;
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
      servisAciklamasi: 'WO-203 not ve ek entegrasyon testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '09:30',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

async function loginAsYetkili(request: APIRequestContext): Promise<string> {
  const randomKey = Date.now();
  const email = `wo203-yetkili-${randomKey}@example.com`;
  const password = 'Yetkili!123';

  const registerResponse = await request.post('/api/auth/register', {
    data: {
      email,
      password,
      ad: 'WO203 Yetkili',
      role: 'YETKILI',
    },
  });
  expect(registerResponse.status()).toBe(201);

  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email,
      password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = (await loginResponse.json()) as LoginResponse;
  expect(loginBody.token).toBeTruthy();

  return loginBody.token;
}

test('WO-203: not ekleme, ek yukleme-indirme ve rol bazli silme', async ({ page }) => {
  await loginAsAdmin(page);

  const boatName = `WO203 BOAT ${Date.now()}`;
  const serviceId = await createService(page, boatName);
  const noteText = `WO203 notu ${Date.now()}`;
  const fileName = `wo203-${Date.now()}.txt`;

  try {
    await page.goto(`/servisler/${serviceId}`);
    await page.getByRole('tab', { name: 'Notlar & Ekler' }).click();

    await page.getByTestId('work-order-note-input').fill(noteText);
    await page.getByTestId('work-order-note-submit').click();
    await expect(page.locator('[data-testid="work-order-notes-list"]:visible').first()).toContainText(noteText);

    await page.getByTestId('work-order-attachment-input').setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('WO-203 attachment payload', 'utf8'),
    });
    await page.getByTestId('work-order-attachment-upload').click();
    await expect(page.locator('[data-testid="work-order-attachments-list"]:visible').first()).toContainText(fileName);

    const downloadResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes(`/api/services/${serviceId}/attachments/`) &&
        response.request().method() === 'GET'
      );
    });

    await page
      .locator('[data-testid="work-order-attachments-list"] li')
      .first()
      .getByRole('button', { name: 'Indir' })
      .click();
    const downloadResponse = await downloadResponsePromise;
    expect(downloadResponse.ok()).toBeTruthy();

    const attachmentId = (await page
      .locator('[data-testid^="work-order-attachment-download-"]:visible')
      .first()
      .getAttribute('data-testid'))?.replace('work-order-attachment-download-', '');
    expect(attachmentId).toBeTruthy();

    const yetkiliToken = await loginAsYetkili(page.request);
    const yetkiliDeleteResponse = await page.request.delete(
      `/api/services/${serviceId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${yetkiliToken}`,
        },
      }
    );
    expect(yetkiliDeleteResponse.status()).toBe(403);

    const deleteButton = page.getByTestId(`work-order-attachment-delete-${attachmentId}`);
    await expect(deleteButton).toBeVisible();
    const deleteResponsePromise = page.waitForResponse((response) => {
      return (
        response.url().includes(`/api/services/${serviceId}/attachments/${attachmentId}`) &&
        response.request().method() === 'DELETE'
      );
    });
    await deleteButton.click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBeTruthy();
    await expect(page.getByText('Ekli dosya bulunmuyor.')).toBeVisible();
  } finally {
    await page.request.delete(`/api/services/${serviceId}`).catch(() => null);
  }
});
