import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
};

async function createUnscheduledService(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();

  const createResponse = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: `TAKVIM TEST ${Date.now()}`,
      adres: 'YATMARIN',
      yer: 'YATMARIN',
      servisAciklamasi: 'Takvim drag-drop planlama test kaydi',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      saat: '09:00',
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const body = (await createResponse.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

test('Takvim dispatch board unscheduled is emrini drag-drop ile planlar', async ({ page }) => {
  await loginAsAdmin(page);
  const serviceId = await createUnscheduledService(page);

  await page.goto('/takvim');
  await expect(page).toHaveURL(/\/takvim/);
  await expect(page.getByRole('heading', { name: 'Takvim Planlama' })).toBeVisible();
  await expect(page.locator('[data-testid^="takvim-resource-capacity-"]').first()).toContainText('Is:');

  const unscheduledCard = page.getByTestId(`takvim-unscheduled-item-${serviceId}`);
  await expect(unscheduledCard).toBeVisible();

  const firstCalendarCell = page.locator('[data-testid^="takvim-cell-"]').first();
  await expect(firstCalendarCell).toBeVisible();

  await unscheduledCard.dragTo(firstCalendarCell);

  await expect(page.getByTestId(`takvim-unscheduled-item-${serviceId}`)).toBeHidden({
    timeout: 20_000,
  });
});
