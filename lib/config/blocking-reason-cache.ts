import type { BlokajNedeni as BlokajNedeniModel } from '@prisma/client';
import prisma from '@/lib/prisma';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type BlokajNedeniKaydi = {
  id?: string;
  key: string;
  label: string;
  description?: string | null;
  durumKey: string;
  sirasi: number;
  aktif: boolean;
};

type BlokajNedeniCacheKaydi = {
  kayitlar: BlokajNedeniKaydi[];
  yuklenmeZamani: number;
};

let blokajNedeniCacheKaydi: BlokajNedeniCacheKaydi | null = null;

const VARSAYILAN_BLOKAJ_NEDENLERI: BlokajNedeniKaydi[] = [
  {
    key: 'PARCA_BEKLIYOR',
    label: 'Parca Bekliyor',
    description: 'Parca tedarik sureci tamamlanmadan is ilerleyemez.',
    durumKey: 'PARCA_BEKLIYOR',
    sirasi: 1,
    aktif: true,
  },
  {
    key: 'ONAY_BEKLIYOR',
    label: 'Onay Bekliyor',
    description: 'Musteri onayi beklenen adim.',
    durumKey: 'MUSTERI_ONAY_BEKLIYOR',
    sirasi: 2,
    aktif: true,
  },
  {
    key: 'RAPOR_BEKLIYOR',
    label: 'Rapor Bekliyor',
    description: 'Kapanis raporu tamamlanmadan ilerlenemez.',
    durumKey: 'RAPOR_BEKLIYOR',
    sirasi: 3,
    aktif: true,
  },
  {
    key: 'SAHA_ERTELEME',
    label: 'Saha Erteleme',
    description: 'Saha kosullari nedeniyle is ertelendi.',
    durumKey: 'ERTELENDI',
    sirasi: 4,
    aktif: true,
  },
];

function cacheGecerliMi(
  cacheKaydi: BlokajNedeniCacheKaydi | null
): cacheKaydi is BlokajNedeniCacheKaydi {
  if (!cacheKaydi) return false;
  return Date.now() - cacheKaydi.yuklenmeZamani < CACHE_TTL_MS;
}

function veritabaniKaydiniDonustur(kayit: BlokajNedeniModel): BlokajNedeniKaydi {
  return {
    id: kayit.id,
    key: kayit.key,
    label: kayit.label,
    description: kayit.description,
    durumKey: kayit.durumKey,
    sirasi: kayit.sirasi,
    aktif: kayit.aktif,
  };
}

export function blokajNedeniCacheSifirla(): void {
  blokajNedeniCacheKaydi = null;
}

export async function aktifBlokajNedenleriniGetir(
  zorlaYenile = false
): Promise<BlokajNedeniKaydi[]> {
  if (!zorlaYenile && cacheGecerliMi(blokajNedeniCacheKaydi)) {
    return blokajNedeniCacheKaydi.kayitlar;
  }

  const kayitlar = await prisma.blokajNedeni.findMany({
    where: { aktif: true },
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  const nedenler =
    kayitlar.length > 0
      ? kayitlar.map(veritabaniKaydiniDonustur)
      : [...VARSAYILAN_BLOKAJ_NEDENLERI];

  blokajNedeniCacheKaydi = {
    kayitlar: nedenler,
    yuklenmeZamani: Date.now(),
  };

  return nedenler;
}

export async function blokajNedeniGetirByKey(anahtar: string): Promise<BlokajNedeniKaydi | null> {
  const nedenler = await aktifBlokajNedenleriniGetir();
  const normalizeAnahtar = anahtar.trim().toUpperCase();
  return nedenler.find((neden) => neden.key.toUpperCase() === normalizeAnahtar) ?? null;
}
