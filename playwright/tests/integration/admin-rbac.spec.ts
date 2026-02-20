import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    ad: string;
    email: string;
    role: 'ADMIN' | 'YETKILI';
  };
};

type ServiceCreateResponse = {
  id: string;
};

async function readAdminToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();
  return token as string;
}

async function registerAndLoginYetkili(request: APIRequestContext): Promise<LoginResponse> {
  const suffix = Date.now();
  const email = `adm703-yetkili-${suffix}@example.com`;
  const password = 'Yetkili!123';

  const registerResponse = await request.post('/api/auth/register', {
    data: {
      email,
      password,
      ad: 'ADM703 Yetkili',
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
  const body = (await loginResponse.json()) as LoginResponse;
  expect(body.token).toBeTruthy();
  expect(body.user.role).toBe('YETKILI');
  return body;
}

async function applySession(page: Page, token: string, user: LoginResponse['user']): Promise<void> {
  await page.goto('/');

  await page.evaluate(
    ({ jwt, sessionUser }) => {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `token=${jwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secure}`;
      window.localStorage.setItem('token', jwt);
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          ...sessionUser,
          rol: sessionUser.role,
        })
      );
    },
    {
      jwt: token,
      sessionUser: user,
    }
  );
}

async function createService(page: Page, token: string): Promise<string> {
  const response = await page.request.post('/api/services', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      tekneAdi: `ADM703 BOAT ${Date.now()}`,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'ADM-703 RBAC delete yetki testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '11:30',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

test('ADM-703: admin olmayan ayarlara giremez ve servis silemez', async ({ page }) => {
  await loginAsAdmin(page);
  const adminToken = await readAdminToken(page);
  const serviceId = await createService(page, adminToken);
  const yetkiliSession = await registerAndLoginYetkili(page.request);

  try {
    await applySession(page, yetkiliSession.token, yetkiliSession.user);

    await page.goto('/ayarlar');
    await expect(page).not.toHaveURL(/\/ayarlar$/);

    const settingsApiResponse = await page.request.get('/api/settings', {
      headers: {
        Authorization: `Bearer ${yetkiliSession.token}`,
      },
    });
    expect(settingsApiResponse.status()).toBe(403);

    const deleteResponse = await page.request.delete(`/api/services/${serviceId}`, {
      headers: {
        Authorization: `Bearer ${yetkiliSession.token}`,
      },
    });
    expect(deleteResponse.status()).toBe(403);
  } finally {
    await page.request.delete(`/api/services/${serviceId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    }).catch(() => null);
  }
});
