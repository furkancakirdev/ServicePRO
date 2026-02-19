import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../../playwright/tests/helpers/login';

async function mockDashboardVerileri(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'admin-user-id',
          ad: 'Admin Kullanici',
          email: 'admin@servicepro.com',
          role: 'ADMIN',
        },
      }),
    });
  });

  await page.route('**/api/dashboard/layout', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          widgets: ['stats', 'operations'],
        }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/dashboard-stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        bugunRandevulu: 2,
        bugunDevamEden: 1,
        bugunTamamlanan: 1,
        bugunToplamOperasyon: 3,
        aktifServisler: 4,
        devamEden: 1,
        parcaBekleyen: 1,
        onayBekleyen: 0,
        raporBekleyen: 0,
        gecikenServisler: 0,
        toplamTekne: 5,
        toplamPersonel: 3,
        aktifTeknisyen: 2,
        thisWeekCompleted: 2,
        unscheduledActive: 0,
        waitingAgingDays: 0,
        locationWorkload: [{ adres: 'Atakoy Marina', count: 2 }],
        statusTransitionFunnel: {
          planned: 2,
          active: 1,
          waiting: 1,
          completedThisWeek: 1,
        },
        unscheduledTrend: [{ date: '2026-02-19', count: 0 }],
        personnelWorkload: [
          {
            id: 'person-1',
            ad: 'Ali Usta',
            unvan: 'Usta',
            aktifServisSayisi: 2,
            capacityStatus: 'NORMAL',
          },
        ],
        syncHealth: {
          latestStatus: 'SUCCESS',
          lastSuccessfulAt: '2026-02-19T09:00:00.000Z',
          ageMinutes: 5,
          stale: false,
        },
        bugununOperasyonlari: [
          {
            id: 'service-1',
            tekneAdi: 'Marlin One',
            tarih: '2026-02-19',
            saat: '10:00',
            yer: 'Atakoy Marina',
            durum: 'RANDEVU_VERILDI',
            isTuru: 'PAKET',
            personelSayisi: 2,
          },
        ],
        teknisyenDurumu: [],
        durumDagilimi: [{ durum: 'RANDEVU_VERILDI', count: 2 }],
        proaktifBakimUyarilari: [],
      }),
    });
  });
}

test('dashboard hiyerarsisi sade ve katmanli olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await mockDashboardVerileri(page);
  await page.goto('/');

  const birincilAlan = page.getByTestId('dashboard-primary-section');
  const detayKutusu = page.getByTestId('dashboard-detail-collapse');

  await expect(birincilAlan).toBeVisible();
  await expect(detayKutusu).toBeVisible();
  await expect(detayKutusu).not.toHaveAttribute('open', '');

  const birincilKonum = await birincilAlan.boundingBox();
  const detayKonum = await detayKutusu.boundingBox();

  expect((birincilKonum?.y ?? 0)).toBeLessThan(detayKonum?.y ?? 0);

  await detayKutusu.locator('summary').click();
  await expect(detayKutusu).toHaveAttribute('open', '');
  await expect(page.getByTestId('dashboard-detail-grid')).toBeVisible();
});
