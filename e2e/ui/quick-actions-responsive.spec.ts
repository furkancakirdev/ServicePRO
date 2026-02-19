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
  await page.goto('/');

  const detayKutusu = page.getByTestId('dashboard-detail-collapse');
  await detayKutusu.locator('summary').click();

  const gridSecici = '[data-testid="quick-actions-panel"] .grid';
  const quickActionsGrid = page.locator(gridSecici);
  await expect(quickActionsGrid).toBeVisible();

  const mobilKolonSayisi = await kolonSayisiniAl(gridSecici, page);
  expect(mobilKolonSayisi).toBe(2);

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopKolonSayisi = await kolonSayisiniAl(gridSecici, page);
  expect(desktopKolonSayisi).toBe(4);
});
