import { expect, test, type Page } from '@playwright/test';

type TemaOlcumu = {
  primaryRgb: string;
  contrastRatio: number;
};

async function temaOlc(page: Page, darkMode: boolean): Promise<TemaOlcumu> {
  return page.evaluate((isDark) => {
    const kok = document.documentElement;
    if (isDark) {
      kok.classList.add('dark');
    } else {
      kok.classList.remove('dark');
    }

    const renkMetniniRgbyeCevir = (deger: string): [number, number, number] => {
      const sahte = document.createElement('span');
      sahte.style.color = deger;
      document.body.appendChild(sahte);
      const rgbMetni = getComputedStyle(sahte).color;
      sahte.remove();

      const eslesme = rgbMetni.match(/\d+/g);
      if (!eslesme || eslesme.length < 3) return [0, 0, 0];
      return [Number(eslesme[0]), Number(eslesme[1]), Number(eslesme[2])];
    };

    const goreliParlaklik = ([r, g, b]: [number, number, number]): number => {
      const donustur = (kanal: number) => {
        const oran = kanal / 255;
        return oran <= 0.03928 ? oran / 12.92 : ((oran + 0.055) / 1.055) ** 2.4;
      };
      const rr = donustur(r);
      const gg = donustur(g);
      const bb = donustur(b);
      return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
    };

    const kontrastOrani = (onPlan: [number, number, number], arkaPlan: [number, number, number]) => {
      const l1 = goreliParlaklik(onPlan);
      const l2 = goreliParlaklik(arkaPlan);
      const acik = Math.max(l1, l2);
      const koyu = Math.min(l1, l2);
      return (acik + 0.05) / (koyu + 0.05);
    };

    const stil = getComputedStyle(kok);
    const primary = renkMetniniRgbyeCevir(`hsl(${stil.getPropertyValue('--primary').trim()})`);
    const foreground = renkMetniniRgbyeCevir(`hsl(${stil.getPropertyValue('--foreground').trim()})`);
    const background = renkMetniniRgbyeCevir(`hsl(${stil.getPropertyValue('--background').trim()})`);

    return {
      primaryRgb: `rgb(${primary[0]}, ${primary[1]}, ${primary[2]})`,
      contrastRatio: kontrastOrani(foreground, background),
    };
  }, darkMode);
}

test('Theme colors', async ({ page }) => {
  await page.goto('/login');

  const light = await temaOlc(page, false);
  expect(light.primaryRgb).toBe('rgb(0, 51, 102)');
  expect(light.contrastRatio).toBeGreaterThanOrEqual(4.5);

  const dark = await temaOlc(page, true);
  expect(dark.primaryRgb).toBe('rgb(59, 130, 246)');
  expect(dark.contrastRatio).toBeGreaterThanOrEqual(4.5);
});
