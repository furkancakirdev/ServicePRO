import type { SystemSetting } from '@prisma/client';
import prisma from '@/lib/prisma';

const CACHE_TTL_MS = 5 * 60 * 1000;

type AyarCacheKaydi = {
  ayarHaritasi: Map<string, SystemSetting>;
  yuklenmeZamani: number;
};

let ayarCacheKaydi: AyarCacheKaydi | null = null;

export type SystemSettingKaynak = 'database' | 'fallback';

export type SystemSettingSonuc = {
  key: string;
  value: string;
  source: SystemSettingKaynak;
  category?: string;
  description?: string | null;
};

export type SystemSettingKaydetGirdisi = {
  key: string;
  value: string;
  category: string;
  description?: string | null;
};

function cacheGecerliMi(cacheKaydi: AyarCacheKaydi | null): cacheKaydi is AyarCacheKaydi {
  if (!cacheKaydi) return false;
  return Date.now() - cacheKaydi.yuklenmeZamani < CACHE_TTL_MS;
}

async function ayarHaritasiniYukle(zorlaYenile = false): Promise<Map<string, SystemSetting>> {
  if (!zorlaYenile && cacheGecerliMi(ayarCacheKaydi)) {
    return ayarCacheKaydi.ayarHaritasi;
  }

  const ayarlar = await prisma.systemSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const ayarHaritasi = new Map<string, SystemSetting>();
  for (const ayar of ayarlar) {
    ayarHaritasi.set(ayar.key, ayar);
  }

  ayarCacheKaydi = {
    ayarHaritasi,
    yuklenmeZamani: Date.now(),
  };

  return ayarHaritasi;
}

export function dynamicSettingsCacheSifirla(): void {
  ayarCacheKaydi = null;
}

export async function tumSystemSettingsGetir(zorlaYenile = false): Promise<SystemSetting[]> {
  const ayarHaritasi = await ayarHaritasiniYukle(zorlaYenile);
  return Array.from(ayarHaritasi.values());
}

export async function systemSettingGetir(
  anahtar: string,
  varsayilanDeger?: string
): Promise<SystemSettingSonuc | null> {
  const ayarHaritasi = await ayarHaritasiniYukle();
  const veritabaniKaydi = ayarHaritasi.get(anahtar);

  if (veritabaniKaydi) {
    return {
      key: veritabaniKaydi.key,
      value: veritabaniKaydi.value,
      source: 'database',
      category: veritabaniKaydi.category,
      description: veritabaniKaydi.description,
    };
  }

  if (varsayilanDeger === undefined) {
    return null;
  }

  return {
    key: anahtar,
    value: varsayilanDeger,
    source: 'fallback',
  };
}

export async function systemSettingKaydet(
  girdi: SystemSettingKaydetGirdisi
): Promise<SystemSetting> {
  const kaydedilen = await prisma.systemSetting.upsert({
    where: { key: girdi.key },
    update: {
      value: girdi.value,
      category: girdi.category,
      description: girdi.description ?? null,
    },
    create: {
      key: girdi.key,
      value: girdi.value,
      category: girdi.category,
      description: girdi.description ?? null,
    },
  });

  dynamicSettingsCacheSifirla();
  return kaydedilen;
}

export async function systemSettingJsonDegeriGetir<T>(
  anahtar: string,
  varsayilanDeger: T
): Promise<T> {
  const sonuc = await systemSettingGetir(anahtar);
  if (!sonuc) return varsayilanDeger;

  try {
    return JSON.parse(sonuc.value) as T;
  } catch {
    return varsayilanDeger;
  }
}
