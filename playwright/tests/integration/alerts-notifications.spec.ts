import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type AuthMeResponse = {
  user?: {
    id: string;
    email: string;
  };
};

type CreatedJob = {
  id: string;
  firstAppointment: {
    id: string;
  };
};

type CreatedRule = {
  id: string;
  ad: string;
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

async function getCurrentUserId(page: Page, token: string): Promise<string> {
  const response = await page.request.get('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as AuthMeResponse;
  expect(body.user?.id).toBeTruthy();
  return body.user!.id;
}

async function createUnconfirmedJob(page: Page, token: string, boatName: string): Promise<CreatedJob> {
  const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const response = await page.request.post('/api/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: boatName,
      adres: 'YATMARIN',
      yer: 'YATMARIN',
      servisAciklamasi: 'Alert evaluator e2e kaydi',
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
  const body = (await response.json()) as CreatedJob;
  expect(body.id).toBeTruthy();
  expect(body.firstAppointment?.id).toBeTruthy();
  return body;
}

async function createAlertRule(
  page: Page,
  token: string,
  name: string,
  userId: string
): Promise<CreatedRule> {
  const response = await page.request.post('/api/alerts/rules', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      ad: name,
      aktif: true,
      eventTipi: 'APPOINTMENT_UNCONFIRMED_24H',
      kosul: {
        thresholdHours: 24,
      },
      hedefUserId: userId,
      kanal: 'IN_APP',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as CreatedRule;
  expect(body.id).toBeTruthy();
  return body;
}

test('Alert evaluate sonrasi bildirim merkezinde read/archive akislari calisir', async ({ page }) => {
  await loginAsAdmin(page);
  const token = await getToken(page);
  const userId = await getCurrentUserId(page, token);

  const suffix = Date.now();
  const ruleName = `E2E Alert Rule ${suffix}`;
  const boatName = `E2E ALERT BOAT ${suffix}`;

  const createdJob = await createUnconfirmedJob(page, token, boatName);
  const createdRule = await createAlertRule(page, token, ruleName, userId);

  try {
    await page.goto('/ayarlar/alerts');
    await expect(page).toHaveURL(/\/ayarlar\/alerts/);
    await expect(page.getByTestId('alerts-rules-table')).toBeVisible();
    await expect(page.getByTestId(`alert-rule-row-${createdRule.id}`)).toContainText(ruleName);

    await page.getByTestId('alerts-evaluate-run').click();
    await expect(page.getByText(/Alert evaluation tamamlandi/i)).toBeVisible();

    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page.getByTestId('notifications-center')).toBeVisible();

    const row = page.locator('tbody tr', { hasText: boatName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('YENI');

    await row.getByRole('button', { name: /Okundu/i }).click();
    await expect(row).toContainText('OKUNDU');

    await row.getByRole('button', { name: /Arsivle/i }).click();
    await expect(row).toContainText('ARSIV');
  } finally {
    await page.request.delete(`/api/alerts/rules/${createdRule.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);

    await page.request.delete(`/api/services/${createdJob.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => null);
  }
});
