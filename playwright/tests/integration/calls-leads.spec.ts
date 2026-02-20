import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type CreatedLead = {
  id: string;
  ad: string | null;
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

async function createLeadViaApi(page: Page, prefix: string): Promise<CreatedLead> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const overdueDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ad = `${prefix} ${Date.now()}`;

  const response = await page.request.post('/api/leads', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      ad,
      telefon: `90${Date.now().toString().slice(-9)}`,
      konu: 'Lead pipeline e2e kaydi',
      takipAt: toTrDateTimeInput(overdueDate),
      status: 'YENI',
      kaynak: 'phone',
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as CreatedLead;
  expect(payload.id).toBeTruthy();

  return payload;
}

test('Calls ekraninda booking olusturup joba donusturur', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/calls');

  await expect(page).toHaveURL(/\/calls/);
  await expect(page.getByTestId('calls-create-form')).toBeVisible();

  const uniquePhone = `90${Date.now().toString().slice(-9)}`;
  const uniqueBoat = `CALL BOAT ${Date.now()}`;

  await page.getByTestId('calls-create-arayan').fill('E2E Caller');
  await page.getByTestId('calls-create-telefon').fill(uniquePhone);
  await page.getByTestId('calls-create-tekne').fill(uniqueBoat);
  await page.getByTestId('calls-create-konu').fill('Call booking convert-to-job e2e');
  await page.getByTestId('calls-create-submit').click();

  await expect(page.getByText(/Booking olusturuldu/i)).toBeVisible();

  const row = page.locator('tbody tr', { hasText: uniquePhone }).first();
  await expect(row).toBeVisible({ timeout: 20000 });

  await row.getByRole('button', { name: /Joba Donustur/i }).click();
  await expect(page.getByText(/Booking joba donusturuldu/i)).toBeVisible();
  await expect(row).toContainText('JOB_OLUSTURULDU');

  const jobLink = row.getByRole('link', { name: /Job Ac/i });
  await expect(jobLink).toBeVisible();
  await jobLink.click();
  await expect(page).toHaveURL(/\/jobs\//);
});

test('Leads pipeline status/follow-up gunceller ve joba donusturur', async ({ page }) => {
  await loginAsAdmin(page);

  const lead = await createLeadViaApi(page, 'E2E LEAD');

  await page.goto('/leads');
  await expect(page).toHaveURL(/\/leads/);
  await expect(page.getByTestId('leads-pipeline')).toBeVisible();

  const card = page.getByTestId(`lead-card-${lead.id}`);
  await expect(card).toBeVisible({ timeout: 20000 });
  await expect(card).toContainText('Overdue');

  await page.getByTestId(`lead-status-${lead.id}`).click();
  await page.getByRole('option', { name: /Takipte/i }).click();
  await expect(page.getByText(/Lead guncellendi/i)).toBeVisible();

  const followupInput = page.getByTestId(`lead-followup-${lead.id}`);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await followupInput.fill(toTrDateTimeInput(tomorrow));
  await followupInput.blur();
  await expect(page.getByText(/Lead guncellendi/i)).toBeVisible();

  await page.getByTestId(`lead-convert-job-${lead.id}`).click();
  await expect(page.getByText(/Lead joba donusturuldu/i)).toBeVisible();
});
