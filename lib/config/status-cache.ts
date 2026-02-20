import type { ServisDurumuAyar } from '@prisma/client';
import prisma from '@/lib/prisma';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type DurumAyarKaydi = {
  id?: string;
  key: string;
  label: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  sirasi: number;
  aktif: boolean;
};

type DurumCacheKaydi = {
  kayitlar: DurumAyarKaydi[];
  yuklenmeZamani: number;
};

let durumCacheKaydi: DurumCacheKaydi | null = null;

const VARSAYILAN_DURUMLAR: DurumAyarKaydi[] = [
  { key: 'RANDEVU_VERILDI', label: 'Randevu Verildi', color: '#0ea5e9', icon: 'calendar', sirasi: 1, aktif: true },
  { key: 'DEVAM_EDIYOR', label: 'Devam Ediyor', color: '#22c55e', icon: 'wrench', sirasi: 2, aktif: true },
  { key: 'PARCA_BEKLIYOR', label: 'Parça Bekliyor', color: '#f59e0b', icon: 'package', sirasi: 3, aktif: true },
  {
    key: 'MUSTERI_ONAY_BEKLIYOR',
    label: 'Müşteri Onay Bekliyor',
    color: '#f97316',
    icon: 'user-check',
    sirasi: 4,
    aktif: true,
  },
  { key: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor', color: '#3b82f6', icon: 'file-text', sirasi: 5, aktif: true },
  { key: 'KESIF_KONTROL', label: 'Keşif/Kontrol', color: '#a855f7', icon: 'search', sirasi: 6, aktif: true },
  { key: 'TAMAMLANDI', label: 'Tamamlandı', color: '#64748b', icon: 'check-circle', sirasi: 7, aktif: true },
  { key: 'IPTAL', label: 'İptal', color: '#ef4444', icon: 'x-circle', sirasi: 8, aktif: true },
  { key: 'ERTELENDI', label: 'Ertelendi', color: '#eab308', icon: 'pause-circle', sirasi: 9, aktif: true },
];

function cacheGecerliMi(cacheKaydi: DurumCacheKaydi | null): cacheKaydi is DurumCacheKaydi {
  if (!cacheKaydi) return false;
  return Date.now() - cacheKaydi.yuklenmeZamani < CACHE_TTL_MS;
}

function veritabaniKaydiniDonustur(kayit: ServisDurumuAyar): DurumAyarKaydi {
  return {
    id: kayit.id,
    key: kayit.key,
    label: kayit.label,
    description: kayit.description,
    color: kayit.color,
    icon: kayit.icon,
    sirasi: kayit.sirasi,
    aktif: kayit.aktif,
  };
}

export function durumCacheSifirla(): void {
  durumCacheKaydi = null;
}

export async function aktifDurumlariGetir(zorlaYenile = false): Promise<DurumAyarKaydi[]> {
  if (!zorlaYenile && cacheGecerliMi(durumCacheKaydi)) {
    return durumCacheKaydi.kayitlar;
  }

  const kayitlar = await prisma.servisDurumuAyar.findMany({
    where: { aktif: true },
    orderBy: [{ sirasi: 'asc' }, { createdAt: 'asc' }],
  });

  const durumlar =
    kayitlar.length > 0 ? kayitlar.map(veritabaniKaydiniDonustur) : [...VARSAYILAN_DURUMLAR];

  durumCacheKaydi = {
    kayitlar: durumlar,
    yuklenmeZamani: Date.now(),
  };

  return durumlar;
}

export async function durumGetirByKey(anahtar: string): Promise<DurumAyarKaydi | null> {
  const durumlar = await aktifDurumlariGetir();
  const normalizeAnahtar = anahtar.trim().toUpperCase();
  return durumlar.find((durum) => durum.key.toUpperCase() === normalizeAnahtar) ?? null;
}
