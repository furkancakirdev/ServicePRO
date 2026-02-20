import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

async function kolonSayisiniAl(selector: string, page: Page): Promise<number> {
  return page.locator(selector).evaluate((element) => {
    const kolonSablonu = window.getComputedStyle(element).gridTemplateColumns;
    return kolonSablonu.split(' ').filter(Boolean).length;
  });
}

test('quick actions mobilde 2, desktopta 4 kolonda gorunmeli', async ({ page }) => {
  await loginAsAdmin(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // QuickActions detay panelinin icinde oldugu icin once detay panelini acalim
  const detayKutusu = page.getByTestId('dashboard-detail-collapse');
  await detayKutusu.waitFor({ state: 'attached', timeout: 10000 });

  // Detay panelini ac (QuickActions icinde)
  await detayKutusu.locator('summary').click();

  // QuickActions panelini bul
  const gridSecici = '[data-testid="quick-actions-panel"] .grid';
  const quickActionsGrid = page.locator(gridSecici);
  await expect(quickActionsGrid).toBeVisible({ timeout: 5000 });

  const mobilKolonSayisi = await kolonSayisiniAl(gridSecici, page);
  expect(mobilKolonSayisi).toBe(2);

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopKolonSayisi = await kolonSayisiniAl(gridSecici, page);
  expect(desktopKolonSayisi).toBe(4);
});
