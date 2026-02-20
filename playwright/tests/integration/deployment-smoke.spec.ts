import { expect, test } from '@playwright/test';

type HealthResponse = {
  status: string;
  db: string;
};

test('Production deployment smoke', async ({ page, request }) => {
  const saglik = await request.get('/api/health');
  expect(saglik.status()).toBe(200);
  const body = (await saglik.json()) as HealthResponse;
  expect(body.status).toBe('ok');
  expect(body.db).toBe('ok');

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
});
