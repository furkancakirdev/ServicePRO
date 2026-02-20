import type { PersonelUnvanAyar as PersonelUnvanModel } from '@prisma/client';
import prisma from '@/lib/prisma';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type UnvanKaydi = {
  id?: string;
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
  aktif: boolean;
};

type UnvanCacheKaydi = {
  kayitlar: UnvanKaydi[];
  yuklenmeZamani: number;
};

let unvanCacheKaydi: UnvanCacheKaydi | null = null;

const VARSAYILAN_UNVANLAR: UnvanKaydi[] = [
  { key: 'USTA', label: 'Usta', puanCarpani: 1.0, sirasi: 1, aktif: true },
  { key: 'CIRAK', label: 'Çırak', puanCarpani: 1.0, sirasi: 2, aktif: true },
  { key: 'YONETICI', label: 'Yönetici', puanCarpani: 1.0, sirasi: 3, aktif: true },
  { key: 'OFIS', label: 'Ofis', puanCarpani: 1.0, sirasi: 4, aktif: true },
];

function cacheGecerliMi(cacheKaydi: UnvanCacheKaydi | null): cacheKaydi is UnvanCacheKaydi {
  if (!cacheKaydi) return false;
  return Date.now() - cacheKaydi.yuklenmeZamani < CACHE_TTL_MS;
}

function veritabaniKaydiniDonustur(kayit: PersonelUnvanModel): UnvanKaydi {
  return {
    id: kayit.id,
    key: kayit.key,
    label: kayit.label,
    puanCarpani: Number(kayit.puanCarpani),
    sirasi: kayit.sirasi,
    aktif: kayit.aktif,
  };
}

export function unvanCacheSifirla(): void {
  unvanCacheKaydi = null;
}

export async function aktifUnvanlariGetir(zorlaYenile = false): Promise<UnvanKaydi[]> {
  if (!zorlaYenile && cacheGecerliMi(unvanCacheKaydi)) {
    return unvanCacheKaydi.kayitlar;
  }

  const kayitlar = await prisma.personelUnvanAyar.findMany({
    where: { aktif: true },
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  const unvanlar =
    kayitlar.length > 0 ? kayitlar.map(veritabaniKaydiniDonustur) : [...VARSAYILAN_UNVANLAR];

  unvanCacheKaydi = {
    kayitlar: unvanlar,
    yuklenmeZamani: Date.now(),
  };

  return unvanlar;
}

export async function unvanGetirByKey(anahtar: string): Promise<UnvanKaydi | null> {
  const unvanlar = await aktifUnvanlariGetir();
  const normalizeAnahtar = anahtar.trim().toUpperCase();
  return unvanlar.find((unvan) => unvan.key.toUpperCase() === normalizeAnahtar) ?? null;
}
