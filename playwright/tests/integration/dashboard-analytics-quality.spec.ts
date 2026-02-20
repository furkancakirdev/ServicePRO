import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('DB-302/DB-303: dashboard analitik ve kalite sekmeleri range filtreleriyle calisir', async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto('/');

  await expect(page.getByTestId('dashboard-operation-page')).toBeVisible();

  await page.getByRole('tab', { name: 'Analitik' }).click();
  await expect(page.getByTestId('dashboard-range-filter')).toBeVisible();

  const analyticsResponse30 = page.waitForResponse((response) =>
    response.url().includes('/api/dashboard-stats?range=30')
  );
  await page.getByTestId('dashboard-range-30').click();
  await analyticsResponse30;

  const analyticsContent = page
    .getByTestId('dashboard-analytics-unscheduled-chart')
    .or(page.getByText('Analitik veri bulunamadi'));
  await expect(analyticsContent).toBeVisible();

  await page.getByRole('tab', { name: 'Kalite' }).click();
  await expect(page.getByTestId('dashboard-quality-range-filter')).toBeVisible();

  const qualityResponse90 = page.waitForResponse((response) =>
    response.url().includes('/api/dashboard-stats?range=90')
  );
  await page.getByTestId('dashboard-quality-range-90').click();
  await qualityResponse90;

  const qualityContent = page
    .getByTestId('dashboard-quality-trend-chart')
    .or(page.getByText('Kalite verisi bulunamadi'));
  await expect(qualityContent).toBeVisible();
});
