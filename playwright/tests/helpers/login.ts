import { expect, type Page } from '@playwright/test';

type LoginYaniti = {
  token: string;
};

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  const origin = new URL(page.url()).origin;
  const localStorageToken = await page.evaluate(() => window.localStorage.getItem('token'));
  if (localStorageToken) return;

  const response = await page.request.post('/api/auth/login', {
    data: {
      email: 'admin@servicepro.com',
      password: 'admin123',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as LoginYaniti;
  expect(body.token).toBeTruthy();

  await page.context().addCookies([
    {
      name: 'token',
      value: body.token,
      url: origin,
    },
  ]);

  await page.evaluate((jwt: string) => {
    window.localStorage.setItem('token', jwt);
  }, body.token);
}
