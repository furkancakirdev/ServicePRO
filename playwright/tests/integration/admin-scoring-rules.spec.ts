import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

type ServiceCreateResponse = {
  id: string;
};

type PersonnelRow = {
  id: string;
  ad: string;
};

type ScoringConfigResponse = {
  success: boolean;
  data: {
    katsayilar: Array<{
      isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
      label: string;
      carpan: number;
    }>;
  };
};

type CompleteResponse = {
  success: boolean;
  scoring?: {
    zorlukSeviyesi: 'RUTIN' | 'ARIZA' | 'PROJE';
    zorlukCarpani: number;
    savedMultiplierId: string | null;
  };
};

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function readToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem('token'));
  expect(token).toBeTruthy();
  return token as string;
}

async function createService(page: Page, token: string): Promise<string> {
  const response = await page.request.post('/api/services', {
    headers: authHeaders(token),
    data: {
      tekneAdi: `ADM702 BOAT ${Date.now()}`,
      adres: 'Marmaris Marina',
      yer: 'YATMARIN',
      servisAciklamasi: 'ADM-702 puanlama katsayi testi',
      tarih: new Date().toISOString().slice(0, 10),
      saat: '10:00',
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
    },
  });

  expect(response.status()).toBe(201);
  const body = (await response.json()) as ServiceCreateResponse;
  expect(body.id).toBeTruthy();
  return body.id;
}

async function getFirstPersonnel(page: Page, token: string): Promise<PersonnelRow> {
  const response = await page.request.get('/api/personel?aktif=true', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as PersonnelRow[];
  expect(body.length).toBeGreaterThan(0);
  return body[0]!;
}

test('ADM-702: katsayi guncellemesi yeni kapanislarda kullanilir', async ({ page }) => {
  await loginAsAdmin(page);

  const token = await readToken(page);
  let serviceId: string | null = null;
  let eskiCarpan: number | null = null;
  let eskiLabel = 'Rutin-Basit Servis';

  try {
    const currentConfigResponse = await page.request.get('/api/admin/puanlama-agirlik', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(currentConfigResponse.ok()).toBeTruthy();
    const currentConfig = (await currentConfigResponse.json()) as ScoringConfigResponse;
    const paketConfig = currentConfig.data.katsayilar.find((row) => row.isTuru === 'PAKET');
    expect(paketConfig).toBeTruthy();
    eskiCarpan = paketConfig!.carpan;
    eskiLabel = paketConfig!.label;

    const yeniCarpan = Number((eskiCarpan + 0.27).toFixed(2));
    const updateResponse = await page.request.put('/api/admin/puanlama-agirlik', {
      headers: authHeaders(token),
      data: {
        katsayilar: [
          {
            isTuru: 'PAKET',
            label: eskiLabel,
            carpan: yeniCarpan,
          },
        ],
      },
    });
    expect(updateResponse.ok()).toBeTruthy();

    serviceId = await createService(page, token);
    const personel = await getFirstPersonnel(page, token);

    const completeResponse = await page.request.post(`/api/services/${serviceId}/complete`, {
      headers: authHeaders(token),
      data: {
        personeller: [{ personelId: personel.id, rol: 'SORUMLU' }],
        bonusPersonelIds: [],
        kaliteKontrol: {
          uniteModelVar: true,
          uniteSaatiVar: true,
          uniteSaatiExcludeFromScoring: false,
          uniteSeriNoVar: true,
          aciklamaYeterli: true,
          adamSaatVar: true,
          adamSaatExcludeFromScoring: false,
          fotograflarVar: true,
        },
      },
    });

    expect(completeResponse.ok()).toBeTruthy();
    const completeBody = (await completeResponse.json()) as CompleteResponse;
    expect(completeBody.success).toBeTruthy();
    expect(completeBody.scoring?.zorlukSeviyesi).toBe('RUTIN');
    expect(completeBody.scoring?.zorlukCarpani).toBeCloseTo(yeniCarpan, 2);
    expect(completeBody.scoring?.savedMultiplierId).toBeTruthy();
  } finally {
    if (serviceId) {
      await page.request.delete(`/api/services/${serviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);
    }

    if (eskiCarpan !== null) {
      await page.request.put('/api/admin/puanlama-agirlik', {
        headers: authHeaders(token),
        data: {
          katsayilar: [
            {
              isTuru: 'PAKET',
              label: eskiLabel,
              carpan: eskiCarpan,
            },
          ],
        },
      }).catch(() => null);
    }
  }
});
