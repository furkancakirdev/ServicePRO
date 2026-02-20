import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

type DokunmaSorunu = {
  etiket: string;
  genislik: number;
  yukseklik: number;
};

test('servisler ekraninda butonlar minimum 36px tiklama alanina sahip olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  const sorunlar = await page.evaluate(() => {
    const seciciler = ['button', '[role="button"]', '[role="combobox"]'] as const;
    const elemanlar = new Set<HTMLElement>();

    seciciler.forEach((secici) => {
      document.querySelectorAll<HTMLElement>(secici).forEach((eleman) => elemanlar.add(eleman));
    });

    return Array.from(elemanlar)
      .filter((eleman) => {
        const stil = window.getComputedStyle(eleman);
        const kutu = eleman.getBoundingClientRect();
        const gorunur =
          stil.display !== 'none' &&
          stil.visibility !== 'hidden' &&
          kutu.width > 0 &&
          kutu.height > 0 &&
          !eleman.closest('[aria-hidden="true"]');
        if (!gorunur) return false;
        return Math.min(kutu.width, kutu.height) < 36;
      })
      .map<DokunmaSorunu>((eleman) => {
        const kutu = eleman.getBoundingClientRect();
        const etiket = eleman.getAttribute('aria-label') || eleman.textContent?.trim() || eleman.tagName;
        return {
          etiket: etiket.slice(0, 40),
          genislik: Math.round(kutu.width),
          yukseklik: Math.round(kutu.height),
        };
      });
  });

  expect(sorunlar).toEqual([]);
});

test('servisler toolbar kontrol alanlari minimum 44px olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/servisler');

  const kontrolAlanlari = [
    page.locator('input[placeholder*="Tekne"]').first(),
    page.getByRole('combobox').first(),
    page.getByRole('button', { name: 'Sutun Gorunurlugu' }).first(),
  ];

  for (const alan of kontrolAlanlari) {
    await expect(alan).toBeVisible();
    const kutu = await alan.boundingBox();
    expect(kutu?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test('sidebar linkleri minimum 44px tiklama alanina sahip olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/');

  const linkler = page.locator('.sidebar-link');
  const adet = await linkler.count();

  expect(adet).toBeGreaterThan(0);

  for (let index = 0; index < adet; index += 1) {
    const kutu = await linkler.nth(index).boundingBox();
    expect(kutu?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});
