import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000);

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  const origin = new URL(page.url()).origin;
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  if (token) return;

  const response = await page.request.post('/api/auth/login', {
    data: {
      email: 'admin@servicepro.com',
      password: 'admin123',
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
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

async function readVisibleTableAddresses(page: Page): Promise<string[]> {
  return page.$$eval('table tbody tr td:nth-child(4)', (cells) =>
    cells.map((cell) => (cell.textContent ?? '').trim()).filter(Boolean)
  );
}

async function readVisibleTableStatuses(page: Page): Promise<string[]> {
  return page.$$eval('table tbody tr [role="combobox"]', (nodes) =>
    nodes.map((node) => (node.textContent ?? '').trim()).filter(Boolean)
  );
}

test.describe('Servisler Sayfası - Varsayılan Görünüm', () => {
  test('sayfa yüklenmeli ve yeni üst özet alanları görünmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1')).toContainText('Servisler');
    await expect(page.getByTestId('toplam-kayit-sayisi')).toBeVisible();
    await expect(page.getByTestId('varsayilan-gorunum-sayisi')).toBeVisible();
    await expect(page.getByTestId('tarihsiz-isler-sayisi')).toBeVisible();
    await expect(page.getByTestId('tarihsiz-durum-ozeti')).toBeVisible();
  });

  test('servis tablosu ve filtre bileşenleri görünmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('table').first()).toBeVisible();
    await expect(page.locator('button:has-text("Durum")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Lokasyon")').first()).toBeVisible();
  });
});

test.describe('Servisler Sayfası - Plan Gereksinim Kontrolleri', () => {
  test('kolon sırası planlanan düzende olmalı', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    const headers = await page.$$eval('table thead th', (ths) =>
      ths.map((th) => (th.textContent ?? '').replace(/\s+/g, ' ').trim())
    );

    expect(headers).toHaveLength(8);
    expect(headers[0]).toContain('Tarih');
    expect(headers[1]).toContain('Saat');
    expect(headers[2]).toContain('Tekne Adi');
    expect(headers[3]).toContain('Adres');
    expect(headers[4]).toContain('Servis Aciklamasi');
    expect(headers[5]).toContain('Durum');
    expect(headers[6]).toContain('Irtibat Kisi');
    expect(headers[7]).toContain('Telefon');
  });

  test('adres segment filtresi çalışmalı ve dış serviste gerçek adres görünmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Yatmarin' }).click();
    await expect(page.locator('text=Lokasyon: Yatmarin')).toBeVisible();

    const yatmarinAddresses = await readVisibleTableAddresses(page);
    expect(yatmarinAddresses.length).toBeGreaterThan(0);
    expect(yatmarinAddresses.every((value) => value.includes('YATMARİN') || value.includes('YATMARIN'))).toBeTruthy();

    await page.getByRole('button', { name: 'Dış Servis' }).click();
    await expect(page.locator('text=Lokasyon: Dış Servis')).toBeVisible();

    const disServisAddresses = await readVisibleTableAddresses(page);
    expect(disServisAddresses.length).toBeGreaterThan(0);
    expect(disServisAddresses.some((value) => value !== 'Dış Servis' && value !== 'DIS_SERVIS')).toBeTruthy();
  });

  test('tarihsiz görünümde ekstra durumlar eklenebilmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Tarihsiz' }).click();
    await page.getByRole('button', { name: 'Hepsi' }).click();
    const durumFiltreTetikleyici = page.getByTestId('inline-filter-durum-trigger');
    await expect(durumFiltreTetikleyici).toContainText('(2)');

    await durumFiltreTetikleyici.click();
    const parcaBekliyorKutusu = page.getByRole('checkbox', { name: 'Parça Bekliyor' });
    await parcaBekliyorKutusu.click();
    await expect(parcaBekliyorKutusu).toBeChecked();
    await expect(durumFiltreTetikleyici).toContainText('(3)');
  });

  test('tamamlanan işler tabloda görünmemeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    const visibleStatuses = await readVisibleTableStatuses(page);
    expect(visibleStatuses.some((status) => status.includes('Tamamlandı'))).toBeFalsy();
  });
});

test.describe('Operasyon Route - Servislere Yönlendirme', () => {
  test('operasyon route servisler sayfasına yönlenmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/operasyon');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/servisler/);
    await expect(page.locator('h1')).toContainText('Servisler');
  });

  test('yönlendirme sonrası servis özet paneli görünmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/operasyon');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('toplam-kayit-sayisi')).toBeVisible();
    await expect(page.getByTestId('aktif-isler-sayisi')).toBeVisible();
    await expect(page.getByTestId('planlanan-isler-sayisi')).toBeVisible();
    await expect(page.getByTestId('tarihsiz-isler-sayisi')).toBeVisible();
    await expect(page.getByTestId('sync-saglik-durumu')).toBeVisible();
  });

  test('yönlendirme sonrası servis filtre kontrolleri görünmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/operasyon');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('button:has-text("Durum")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Lokasyon")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Tarih")').first()).toBeVisible();
  });
});

test.describe('API Entegrasyon Kontrolleri', () => {
  test('sync status endpoint yeni sağlık alanlarını döndürmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/sync/status');
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    });

    expect(result.status).toBe(200);
    expect(result.data).toHaveProperty('lastSuccessfulAt');
    expect(result.data).toHaveProperty('ageSeconds');
    expect(result.data).toHaveProperty('stale');
  });

  test('full-reset endpoint scope parametresini almalı ve confirm olmadan reddetmeli', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/servisler');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/sync/full-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'sheet-only', confirm: false }),
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    });

    expect(result.status).toBe(400);
    expect(result.data).toHaveProperty('error');
  });

  test('sync endpoint dateValidation alanı döndürmeli', async ({ request }) => {
    const response = await request.get('/api/sync');

    expect([200, 401]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('dateValidation');
      expect(data.dateValidation).toHaveProperty('issuesFound');
      expect(Array.isArray(data.dateValidation.details)).toBe(true);
    }
  });

  test('operations overview endpoint erişilebilir olmalı', async ({ request }) => {
    const response = await request.get('/api/operations/overview');
    expect([200, 401]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('totals');
      expect(data).toHaveProperty('capacity');
      expect(data).toHaveProperty('yatmarinByDay');
      expect(data).toHaveProperty('externalDestinations');
      expect(data).toHaveProperty('unscheduledByStatus');
      expect(data).toHaveProperty('locationBreakdown');
    }
  });
});
