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
          widgets: ['stats', 'operations', 'technicians', 'alerts', 'weather'],
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
        bugunTamamlanan: 0,
        bugunToplamOperasyon: 3,
        aktifServisler: 4,
        devamEden: 1,
        parcaBekleyen: 1,
        onayBekleyen: 0,
        raporBekleyen: 0,
        gecikenServisler: 0,
        acilServisler: 0,
        toplamTekne: 5,
        toplamPersonel: 3,
        aktifTeknisyen: 2,
        thisWeekCompleted: 1,
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
        teknisyenDurumu: [
          {
            id: 'person-1',
            ad: 'Ali Usta',
            unvan: 'Usta',
            aktifServisSayisi: 2,
            bosMu: false,
          },
        ],
        durumDagilimi: [{ durum: 'RANDEVU_VERILDI', count: 2 }],
        proaktifBakimUyarilari: [],
      }),
    });
  });
}

test('dashboard metinleri okunabilir ve sade olmali', async ({ page }) => {
  await loginAsAdmin(page);
  await mockDashboardVerileri(page);

  await page.goto('/');

  const dashboardAlani = page.getByTestId('dashboard-grid-container');
  await expect(dashboardAlani).toBeVisible();

  await expect(
    dashboardAlani.getByRole('heading', { name: 'Dashboard' })
  ).toBeVisible();
  // Grand Maritime: Widget metni "duzenle" yerine "düzenle" (Turkce karakter)
  await expect(dashboardAlani.getByText(/Widgetleri.*[dD]üzenle/)).toBeVisible();

  const duzenleButonu = page.getByTestId('dashboard-edit-button');
  await expect(duzenleButonu).toContainText(/Düzenle/);

  await duzenleButonu.click();
  await expect(duzenleButonu).toContainText(/Düzenlemeyi Bitir/);
});

test('dashboard istatistik kartlari gereksiz aciklama icermemeli', async ({ page }) => {
  await loginAsAdmin(page);
  await mockDashboardVerileri(page);
  await page.goto('/');

  await expect(page.getByTestId('dashboard-grid-container')).toBeVisible();

  await expect(page.getByText('Bugun planlanan toplam operasyon')).toHaveCount(0);
  await expect(page.getByText('Su an acik olan isler')).toHaveCount(0);
  await expect(page.getByText('Ayni gun icinde kapanan isler')).toHaveCount(0);
});
