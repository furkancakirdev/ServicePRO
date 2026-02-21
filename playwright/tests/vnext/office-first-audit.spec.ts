import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

const KANONIK_SAYFALAR: Array<{ path: string; title: string }> = [
  { path: '/operasyon', title: 'Operasyon' },
  { path: '/is-emirleri', title: 'İş Emirleri' },
  { path: '/is-emirleri/yeni', title: 'Yeni İş Emri' },
  { path: '/takvim', title: 'Planlama' },
  { path: '/talepler', title: 'Talepler' },
  { path: '/tekneler', title: 'Tekneler' },
  { path: '/personel', title: 'Personel' },
  { path: '/ayarlar', title: 'Ayarlar' },
];

const ENGELLI_INGILIZCE_TERIMLER = [
  'Jobs',
  'Dispatch',
  'Calls',
  'Leads',
  'Today',
  'Technician',
  'Queue',
  'Template',
  'Templates',
  'Pricebook',
  'Notification',
  'Alert',
  'Comfortable',
  'Compact',
];

async function sayfayiAc(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
}

async function uiTasmaKontroluYap(page: Page, route: string): Promise<void> {
  const tasma = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    return {
      htmlOverflow: html.scrollWidth - window.innerWidth,
      bodyOverflow: body.scrollWidth - window.innerWidth,
    };
  });

  expect(
    tasma.htmlOverflow,
    `${route} sayfasında html düzeyinde yatay taşma var`
  ).toBeLessThanOrEqual(1);
  expect(
    tasma.bodyOverflow,
    `${route} sayfasında body düzeyinde yatay taşma var`
  ).toBeLessThanOrEqual(1);
}

async function metinKalitesiKontroluYap(page: Page, route: string): Promise<void> {
  const bodyText = await page.locator('body').innerText();

  const mojibake = bodyText.match(/Ã.|Å.|Ä.|�/g);
  expect(
    mojibake,
    `${route} sayfasında bozuk karakter tespit edildi: ${(mojibake ?? []).slice(0, 5).join(', ')}`
  ).toBeNull();

  for (const kelime of ENGELLI_INGILIZCE_TERIMLER) {
    const regex = new RegExp(`\\b${kelime}\\b`, 'i');
    expect(
      regex.test(bodyText),
      `${route} sayfasında engelli İngilizce terim bulundu: ${kelime}`
    ).toBeFalsy();
  }
}

test.describe('Office-first vNext Playwright denetimleri', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }) => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await loginAsAdmin(page);
        return;
      } catch (error) {
        lastError = error;
        await page.waitForTimeout(1000);
      }
    }
    throw lastError;
  });

  test('Canonical sayfalar: UI + karakter kalite denetimi', async ({ page }) => {
    await sayfayiAc(page, '/operasyon');

    await expect(page.locator('.ant-layout-sider')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Operasyon' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'İş Emirleri' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Planlama' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Talepler' })).toBeVisible();
    await expect(page.getByText('Yönetim')).toBeVisible();

    for (const sayfa of KANONIK_SAYFALAR) {
      await sayfayiAc(page, sayfa.path);
      await expect(page, `${sayfa.path} route açılamadı`).toHaveURL(
        new RegExp(`${sayfa.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?.*)?$`)
      );
      await expect(page.locator('.ant-pro-layout')).toBeVisible();
      await uiTasmaKontroluYap(page, sayfa.path);
      await metinKalitesiKontroluYap(page, sayfa.path);
    }
  });

  test('Route temizliği: redirect kontrolleri', async ({ page }) => {
    const redirectCases: Array<{ from: string; expected: RegExp }> = [
      { from: '/dispatch', expected: /\/takvim$/ },
      { from: '/calls', expected: /\/talepler\?source=telefon$/ },
      { from: '/calls/test-id', expected: /\/talepler\?source=telefon$/ },
      { from: '/jobs', expected: /\/is-emirleri$/ },
      { from: '/jobs/test-id', expected: /\/is-emirleri\/test-id$/ },
      { from: '/jobs/test-id/edit', expected: /\/is-emirleri\/test-id$/ },
      { from: '/servisler', expected: /\/is-emirleri$/ },
      { from: '/servisler/test-id', expected: /\/is-emirleri\/test-id$/ },
      { from: '/servisler/test-id/duzenle', expected: /\/is-emirleri\/test-id$/ },
      { from: '/pricebook', expected: /\/ayarlar\/devre-disi\?modul=pricebook$/ },
      { from: '/templates/jobs', expected: /\/ayarlar\/devre-disi\?modul=sablon$/ },
      { from: '/leads', expected: /\/talepler$/ },
    ];

    for (const testCase of redirectCases) {
      await sayfayiAc(page, testCase.from);
      await expect(page, `${testCase.from} redirect hedefi hatalı`).toHaveURL(testCase.expected);
    }
  });

  test('İş akışı kontrolleri: Talep -> İş Emri -> Planlama + validasyon', async ({ page }) => {
    const testKonu = `PW Talep ${Date.now()}`;

    const talepOlusturResponse = await page.request.post('/api/leads', {
      data: {
        ad: 'Playwright Talep',
        telefon: '5550001234',
        konu: testKonu,
        kaynak: 'telefon',
        status: 'YENI',
      },
    });
    expect(talepOlusturResponse.ok()).toBeTruthy();

    await sayfayiAc(page, `/talepler?q=${encodeURIComponent(testKonu)}`);

    const talepSatiri = page.locator('tr', { hasText: testKonu }).first();
    await expect(talepSatiri).toBeVisible();
    await talepSatiri.getByText('İş Emrine Dönüştür').first().click();
    await page.getByRole('button', { name: 'Dönüştür' }).click();

    await page.waitForURL(/\/is-emirleri\/[^/?#]+$/, { timeout: 30_000 });
    const isEmriId = page.url().split('/is-emirleri/')[1].split('?')[0].split('/')[0];
    expect(isEmriId).toBeTruthy();

    await expect(page.getByRole('button', { name: 'Blokaj Ekle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'İş Emrini Kapat' })).toBeVisible();

    await page.getByRole('button', { name: 'Blokaj Ekle' }).click();
    const blokajModal = page.locator('.ant-modal').filter({ hasText: 'Blokaj Kaydı' }).last();
    await expect(blokajModal).toBeVisible();
    await blokajModal.getByRole('button', { name: 'Blokaja Al' }).click();
    await expect(page.locator('.ant-message-notice').last()).toContainText('Blokaj nedeni seçimi zorunludur.');
    await blokajModal.getByRole('button', { name: 'Vazgeç' }).click();

    await page.getByRole('button', { name: 'İş Emrini Kapat' }).click();
    const kapanisModal = page.locator('.ant-modal').filter({ hasText: 'İş Emrini Kapat' }).last();
    await expect(kapanisModal).toBeVisible();
    await kapanisModal.getByRole('button', { name: 'Kapat' }).click();
    await expect(page.locator('.ant-message-notice').last()).toContainText('Kapanış özeti zorunludur.');

    await kapanisModal.locator('textarea').first().fill('Playwright süreç kontrol özeti');
    await kapanisModal.getByRole('button', { name: 'Kapat' }).click();
    await expect(page.locator('.ant-message-notice').last()).toContainText(
      'Kapanış için en az bir teknisyen atanmış olmalıdır.'
    );
    await kapanisModal.getByRole('button', { name: 'Vazgeç' }).click();

    const unscheduleResponse = await page.request.patch(`/api/services/${isEmriId}`, {
      data: {
        tarih: null,
      },
    });
    expect(unscheduleResponse.ok()).toBeTruthy();

    await sayfayiAc(page, '/takvim');
    await expect(page.getByTestId('takvim-planning-board')).toBeVisible();
    await page.getByPlaceholder('Tekne veya açıklama ara').fill(testKonu);

    const planlanmamisKart = page.getByTestId(`takvim-unscheduled-item-${isEmriId}`);
    await expect(planlanmamisKart).toBeVisible();
    const hedefHucre = page.locator('[data-testid^="takvim-cell-planli-"]').first();
    await planlanmamisKart.dragTo(hedefHucre);
    await expect(page.locator('.ant-message-notice').last()).toContainText('Planlama tarihi güncellendi.');

    await expect(page.getByTestId(`takvim-event-${isEmriId}`)).toBeVisible();
    await expect(page.getByTestId(`takvim-unscheduled-item-${isEmriId}`)).toHaveCount(0);

    await uiTasmaKontroluYap(page, '/takvim');
    await metinKalitesiKontroluYap(page, '/takvim');
  });
});
