import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type CreateJobResponse = {
  id: string;
  firstAppointment: {
    id: string;
    personelId: string | null;
  };
};

type CreatedJobContext = {
  jobId: string;
  initialStartAt: Date;
  initialEndAt: Date;
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

async function createJobWithFirstAppointment(page: Page): Promise<CreatedJobContext> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  // Cakisma riskini azaltmak icin ileri tarih + sabit sabah slotu.
  const dayOffset = 21 + Math.floor(Math.random() * 7);
  const baseStart = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  baseStart.setUTCHours(4, 0, 0, 0); // 07:00 TR
  const baseEnd = new Date(baseStart.getTime() + 60 * 60 * 1000);

  const createResponse = await page.request.post('/api/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: `JOB APPT TEST ${Date.now()}`,
      adres: 'Yatmarin Test Iskele',
      yer: 'Yatmarin',
      servisAciklamasi: 'Jobs + appointments overlap test kaydi',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      firstAppointment: {
        baslangicAt: toTrDateTimeInput(baseStart),
        bitisAt: toTrDateTimeInput(baseEnd),
        personelId: 'personel-1',
        status: 'PLANLANDI',
      },
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const body = (await createResponse.json()) as CreateJobResponse;
  expect(body.id).toBeTruthy();
  expect(body.firstAppointment.id).toBeTruthy();
  expect(body.firstAppointment.personelId).toBeTruthy();

  return {
    jobId: body.id,
    initialStartAt: baseStart,
    initialEndAt: baseEnd,
  };
}

test('Job detail appointments tab overlap conflictte rollback + toast gosterir', async ({ page }) => {
  await loginAsAdmin(page);
  const created = await createJobWithFirstAppointment(page);

  await page.goto(`/jobs/${created.jobId}`);
  await expect(page).toHaveURL(new RegExp(`/jobs/${created.jobId}`));

  await page.getByRole('tab', { name: 'Appointments' }).click();
  await expect(page.getByTestId('job-appointments-tab')).toBeVisible();
  await expect(page.locator('[data-testid^="job-appointment-item-"]')).toHaveCount(1);

  const overlapStart = new Date(created.initialStartAt.getTime() + 30 * 60 * 1000);
  const overlapEnd = new Date(overlapStart.getTime() + 60 * 60 * 1000);

  await page.getByTestId('job-appointment-create').click();
  await page.getByTestId('job-appointment-start').fill(toTrDateTimeInput(overlapStart));
  await page.getByTestId('job-appointment-end').fill(toTrDateTimeInput(overlapEnd));
  await page.getByTestId('job-appointment-personel').click();
  await page.getByRole('option', { name: /Ali Can/i }).click();
  await page.getByTestId('job-appointment-save').click();

  await expect(page.getByText(/cakisan bir randevu var/i)).toBeVisible();
  await expect(page.locator('[data-testid^="job-appointment-item-"]')).toHaveCount(1);

  const nonOverlapStart = new Date(created.initialEndAt.getTime() + 30 * 60 * 1000);
  const nonOverlapEnd = new Date(nonOverlapStart.getTime() + 60 * 60 * 1000);

  await page.getByTestId('job-appointment-start').fill(toTrDateTimeInput(nonOverlapStart));
  await page.getByTestId('job-appointment-end').fill(toTrDateTimeInput(nonOverlapEnd));
  await page.getByTestId('job-appointment-save').click();

  await expect(page.getByText(/Randevu olusturuldu/i)).toBeVisible();
  await expect(page.locator('[data-testid^="job-appointment-item-"]')).toHaveCount(2);
});
