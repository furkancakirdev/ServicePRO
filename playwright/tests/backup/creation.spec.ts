import { expect, test } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { loginAsAdmin } from '../helpers/login';

type HamYedekIcerigi = {
  version?: string;
  timestamp?: string;
  metadata?: {
    recordCount?: number;
    tables?: string[];
  };
  data?: Record<string, unknown>;
};

function yedekKlasorYoluGetir(): string {
  const ortamDegeri = process.env.BACKUP_DIR?.trim();
  if (ortamDegeri) return path.resolve(ortamDegeri);
  return path.join(process.cwd(), 'backups');
}

async function yedekDosyalariniGetir(): Promise<string[]> {
  const klasor = yedekKlasorYoluGetir();
  await fs.mkdir(klasor, { recursive: true });
  const dosyalar = await fs.readdir(klasor);
  return dosyalar.filter((dosya) => dosya.endsWith('.json'));
}

test('Backup creation', async ({ page }) => {
  const oncekiDosyalar = new Set(await yedekDosyalariniGetir());

  await loginAsAdmin(page);
  await page.goto('/ayarlar/yedekleme');

  await page.click('[data-testid="backup-create-button"]');
  await expect(page.locator('[data-testid="backup-success-message"]')).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator('[data-testid="backup-list"]')).toContainText('servicepro-');

  const sonrakiDosyalar = await yedekDosyalariniGetir();
  const yeniDosya = sonrakiDosyalar.find((dosya) => !oncekiDosyalar.has(dosya));

  expect(yeniDosya).toBeTruthy();
  if (!yeniDosya) return;

  const yedekYolu = path.join(yedekKlasorYoluGetir(), yeniDosya);
  const hamIcerik = await fs.readFile(yedekYolu, 'utf8');
  const parsed = JSON.parse(hamIcerik) as HamYedekIcerigi;

  expect(parsed.version).toBe('1.0');
  expect(parsed.timestamp).toBeTruthy();
  expect(parsed.metadata?.recordCount ?? 0).toBeGreaterThan(0);
  expect(parsed.metadata?.tables?.length ?? 0).toBeGreaterThan(0);
  expect(parsed.metadata?.tables).toContain('Service');
  expect(parsed.data).toBeTruthy();
  expect(Array.isArray(parsed.data?.Service)).toBe(true);
});
