import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type CreateJobResponse = {
  id: string;
  firstAppointment: {
    id: string;
    personelId: string | null;
  };
};

type CreatedDispatchContext = {
  jobId: string;
  appointmentId: string;
};

type DispatchAppointment = {
  id: string;
  personelId: string | null;
  baslangicAt: string;
  bitisAt: string;
};

function findSafeStartTime(
  dayKey: string,
  personelId: string,
  appointments: DispatchAppointment[]
): { baslangicAt: string; bitisAt: string } {
  const personelAppointments = appointments
    .filter((item) => item.personelId === personelId)
    .map((item) => ({
      start: new Date(item.baslangicAt),
      end: new Date(item.bitisAt),
    }))
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  let candidateStart = new Date(`${dayKey}T08:00:00+03:00`);
  let candidateEnd = new Date(candidateStart.getTime() + 60 * 60 * 1000);

  for (const slot of personelAppointments) {
    if (candidateEnd <= slot.start) {
      break;
    }
    if (candidateStart >= slot.end) {
      continue;
    }
    candidateStart = new Date(slot.end.getTime() + 30 * 60 * 1000);
    candidateEnd = new Date(candidateStart.getTime() + 60 * 60 * 1000);
  }

  return {
    baslangicAt: candidateStart.toISOString(),
    bitisAt: candidateEnd.toISOString(),
  };
}

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

async function createUnassignedJobWithAppointment(page: Page): Promise<CreatedDispatchContext> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const start = new Date();
  start.setUTCHours(1, 0, 0, 0); // 04:00 TR
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const response = await page.request.post('/api/jobs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: `DISPATCH TEST ${Date.now()}`,
      adres: 'YATMARIN',
      yer: 'YATMARIN',
      servisAciklamasi: 'Dispatch board move endpoint test kaydi',
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
  const body = (await response.json()) as CreateJobResponse;
  expect(body.id).toBeTruthy();
  expect(body.firstAppointment.id).toBeTruthy();
  expect(body.firstAppointment.personelId).toBeNull();

  return {
    jobId: body.id,
    appointmentId: body.firstAppointment.id,
  };
}

test('Dispatch board unassigned tray item move endpointi ile lane icine duser', async ({ page }) => {
  await loginAsAdmin(page);
  const created = await createUnassignedJobWithAppointment(page);

  await page.goto('/dispatch');
  await expect(page).toHaveURL(/\/dispatch/);
  await expect(page.getByRole('heading', { name: 'Dispatch Board' })).toBeVisible();

  const trayItem = page.getByTestId(`dispatch-tray-item-${created.appointmentId}`);
  await expect(trayItem).toBeVisible();

  const firstLaneCell = page.locator('[data-testid^="dispatch-cell-"]').first();
  await expect(firstLaneCell).toBeVisible();
  const cellTestId = await firstLaneCell.getAttribute('data-testid');
  expect(cellTestId).toBeTruthy();
  const match = cellTestId!.match(/^dispatch-cell-(.+)-(\d{4}-\d{2}-\d{2})$/);
  expect(match).not.toBeNull();
  const personelId = match![1];
  const dayKey = match![2];
  expect(personelId).toBeTruthy();

  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const dayResponse = await page.request.get(`/api/dispatch/day?date=${dayKey}&personelId=${personelId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(dayResponse.ok()).toBeTruthy();
  const dayPayload = (await dayResponse.json()) as {
    appointments: DispatchAppointment[];
  };
  const safeSlot = findSafeStartTime(dayKey, personelId, dayPayload.appointments);

  const moveResponse = await page.request.post('/api/dispatch/move', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      appointmentId: created.appointmentId,
      personelId,
      baslangicAt: safeSlot.baslangicAt,
      bitisAt: safeSlot.bitisAt,
    },
  });
  expect(moveResponse.ok()).toBeTruthy();

  await page.getByTestId('dispatch-refresh').click();
  await expect(page.getByTestId(`dispatch-tray-item-${created.appointmentId}`)).toBeHidden({
    timeout: 20_000,
  });
  await expect(page.getByTestId(`dispatch-appointment-${created.appointmentId}`)).toBeVisible();
});
