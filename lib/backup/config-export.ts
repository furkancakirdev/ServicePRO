import { prisma } from '@/lib/prisma';
import { guvenliJsonNesnesi, type KonfigYedekSonucu } from './types';

const HASSAS_ANAHTAR_KELIMELERI = [
  'PASSWORD',
  'SECRET',
  'TOKEN',
  'KEY',
  'DATABASE_URL',
  'AUTH',
  'PRIVATE',
  'CERT',
];

function hassasDegerMi(anahtar: string): boolean {
  const buyukAnahtar = anahtar.toUpperCase();
  return HASSAS_ANAHTAR_KELIMELERI.some((kelime) =>
    buyukAnahtar.includes(kelime)
  );
}

function maskeleDeger(deger: string): string {
  if (deger.length <= 4) return '****';
  return `${deger.slice(0, 2)}****${deger.slice(-2)}`;
}

function maskeleCevreDegiskenleri(): Record<string, string> {
  const anahtarlar = Object.keys(process.env).sort((a, b) => a.localeCompare(b));
  const sonuc: Record<string, string> = {};

  for (const anahtar of anahtarlar) {
    const deger = process.env[anahtar];
    if (deger === undefined) continue;
    sonuc[anahtar] = hassasDegerMi(anahtar) ? maskeleDeger(deger) : deger;
  }

  return sonuc;
}

export async function konfigVerisiniDisaAktar(): Promise<KonfigYedekSonucu> {
  const ayarlar = await prisma.setting.findMany({
    orderBy: { anahtar: 'asc' },
  });

  return {
    ayarlar: ayarlar.map((kayit) => guvenliJsonNesnesi(kayit)),
    cevreDegiskenleri: maskeleCevreDegiskenleri(),
  };
}
