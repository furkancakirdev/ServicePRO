import { expect, test } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

test('sayfalar mobilde tasma olmamali', async ({ page }) => {
  await loginAsAdmin(page);
  await page.setViewportSize({ width: 375, height: 667 });

  for (const rota of ['/servisler', '/ayarlar']) {
    await page.goto(rota);

    const boyutlar = await page.evaluate(() => ({
      govde: document.body.scrollWidth,
      belge: document.documentElement.scrollWidth,
      gorunen: window.innerWidth,
    }));

    expect(boyutlar.govde).toBeLessThanOrEqual(boyutlar.gorunen + 1);
    expect(boyutlar.belge).toBeLessThanOrEqual(boyutlar.gorunen + 1);
  }
});
