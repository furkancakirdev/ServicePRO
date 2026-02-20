import type { Konum as KonumModel } from '@prisma/client';
import prisma from '@/lib/prisma';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type KonumKaydi = {
  id?: string;
  key: string;
  label: string;
  adres?: string | null;
  telefon?: string | null;
  sirasi: number;
  aktif: boolean;
};

type KonumCacheKaydi = {
  kayitlar: KonumKaydi[];
  yuklenmeZamani: number;
};

let konumCacheKaydi: KonumCacheKaydi | null = null;

const VARSAYILAN_KONUMLAR: KonumKaydi[] = [
  { key: 'YATMARIN', label: 'Yatmarin (Merkez)', sirasi: 1, aktif: true },
  { key: 'NETSEL', label: 'Netsel', sirasi: 2, aktif: true },
  { key: 'DIS_SERVIS', label: 'Dış Servis', sirasi: 3, aktif: true },
];

function cacheGecerliMi(cacheKaydi: KonumCacheKaydi | null): cacheKaydi is KonumCacheKaydi {
  if (!cacheKaydi) return false;
  return Date.now() - cacheKaydi.yuklenmeZamani < CACHE_TTL_MS;
}

function veritabaniKaydiniDonustur(kayit: KonumModel): KonumKaydi {
  return {
    id: kayit.id,
    key: kayit.key,
    label: kayit.label,
    adres: kayit.adres,
    telefon: kayit.telefon,
    sirasi: kayit.sirasi,
    aktif: kayit.aktif,
  };
}

export function konumCacheSifirla(): void {
  konumCacheKaydi = null;
}

export async function aktifKonumlariGetir(zorlaYenile = false): Promise<KonumKaydi[]> {
  if (!zorlaYenile && cacheGecerliMi(konumCacheKaydi)) {
    return konumCacheKaydi.kayitlar;
  }

  const kayitlar = await prisma.konum.findMany({
    where: { aktif: true },
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  const konumlar =
    kayitlar.length > 0 ? kayitlar.map(veritabaniKaydiniDonustur) : [...VARSAYILAN_KONUMLAR];

  konumCacheKaydi = {
    kayitlar: konumlar,
    yuklenmeZamani: Date.now(),
  };

  return konumlar;
}

export async function konumGetirByKey(anahtar: string): Promise<KonumKaydi | null> {
  const konumlar = await aktifKonumlariGetir();
  const normalizeAnahtar = anahtar.trim().toUpperCase();
  return konumlar.find((konum) => konum.key.toUpperCase() === normalizeAnahtar) ?? null;
}
