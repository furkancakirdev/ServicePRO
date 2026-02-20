import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

test('sidebar ve ana icerik renk uyumlu olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');

  const sidebarRengi = await page.locator('.sidebar').evaluate((el) => getComputedStyle(el).backgroundColor);
  const anaIcerikRengi = await page.locator('main.main-content').evaluate((el) => getComputedStyle(el).backgroundColor);
  const aktifLinkRengi = await page
    .locator('.sidebar-link.active')
    .first()
    .evaluate((el) => getComputedStyle(el).color);

  expect(sidebarRengi).toBe('rgb(250, 248, 245)'); // cream-50: #FAF8F5
  expect(anaIcerikRengi).toBe('rgb(250, 248, 245)'); // cream-50: #FAF8F5
  expect(aktifLinkRengi).toBe('rgb(10, 35, 66)'); // navy-900: #0A2342
});

test('sidebar aktif link renkleri tema degisiminde uyarlanmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  const aktifLink = page.locator('.sidebar-link.active').first();
  const acikTemaYaziRengi = await aktifLink.evaluate((el) => getComputedStyle(el).color);
  const acikTemaArkaPlanRengi = await aktifLink.evaluate((el) => getComputedStyle(el).backgroundColor);

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  const koyuTemaYaziRengi = await aktifLink.evaluate((el) => getComputedStyle(el).color);
  const koyuTemaArkaPlanRengi = await aktifLink.evaluate((el) => getComputedStyle(el).backgroundColor);

  expect(koyuTemaYaziRengi).not.toBe(acikTemaYaziRengi);
  expect(koyuTemaArkaPlanRengi).not.toBe(acikTemaArkaPlanRengi);
});

test('hero panel renk katmanlari tema degisiminde farkli olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  const heroPanel = page.locator('.hero-panel').first();
  await expect(heroPanel).toBeVisible();

  const acikTemaArkaPlanKatmani = await heroPanel.evaluate(
    (el) => getComputedStyle(el).backgroundImage
  );
  const acikTemaYaziRengi = await heroPanel.evaluate((el) => getComputedStyle(el).color);

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  const koyuTemaArkaPlanKatmani = await heroPanel.evaluate(
    (el) => getComputedStyle(el).backgroundImage
  );
  const koyuTemaYaziRengi = await heroPanel.evaluate((el) => getComputedStyle(el).color);

  expect(koyuTemaArkaPlanKatmani).not.toBe(acikTemaArkaPlanKatmani);
  expect(koyuTemaYaziRengi).not.toBe(acikTemaYaziRengi);
});

test('ana ekran aksiyon butonu tema degisiminde renk guncellemeli', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');

  const yeniServisButonu = page.getByRole('button', { name: 'Yeni servis' }).first();
  await expect(yeniServisButonu).toBeVisible();

  const acikTemaArkaPlanKatmani = await yeniServisButonu.evaluate(
    (el) => getComputedStyle(el).backgroundImage
  );

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  const koyuTemaArkaPlanKatmani = await yeniServisButonu.evaluate(
    (el) => getComputedStyle(el).backgroundImage
  );

  expect(koyuTemaArkaPlanKatmani).not.toBe(acikTemaArkaPlanKatmani);
});

test('ayarlar panel renkleri tema degisiminde uyarlanmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/ayarlar');

  const ayarlarPaneli = page.locator('.surface-panel').first();
  await expect(ayarlarPaneli).toBeVisible();

  const acikTemaArkaPlanRengi = await ayarlarPaneli.evaluate(
    (el) => getComputedStyle(el).backgroundColor
  );

  await page.click('[data-testid="theme-switcher-trigger"]');
  await page.click('[data-testid="theme-switcher-option-dark"]');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBeTruthy();

  const koyuTemaArkaPlanRengi = await ayarlarPaneli.evaluate(
    (el) => getComputedStyle(el).backgroundColor
  );

  expect(koyuTemaArkaPlanRengi).not.toBe(acikTemaArkaPlanRengi);
});

test('ayarlar sayfasinda hard-coded slate siniflari kalmamali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/ayarlar');
  await expect(page.locator('.page-title').first()).toBeVisible();

  const hardCodedSiniflar = await page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter((el) => {
        const className = el.className;
        if (typeof className !== 'string') return false;
        // Grand Maritime kullanımı: navy, cream, gold, seafoam, sunset, skyblue, coral
        // Slate sadece belirli amaçlar için kullanılmalı (text-slate-500 gibi muted text)
        const hasSlateBg = className.includes('bg-slate-');
        const hasSlateBorder = className.includes('border-slate-');
        // text-slate-500 muted foreground için izin veriliyor
        const hasProblematicSlateText = className.includes('text-slate-') &&
                                        !className.includes('text-slate-500');
        return hasSlateBg || hasSlateBorder || hasProblematicSlateText;
      })
      .map((el) => el.className);
  });

  expect(hardCodedSiniflar).toEqual([]);
});
