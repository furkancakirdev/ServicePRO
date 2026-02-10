function normalizeKey(value: string): string {
  return value
    .replace(/[İI]/g, 'I')
    .replace(/[ı]/g, 'I')
    .replace(/[Ğ]/g, 'G')
    .replace(/[ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[ş]/g, 'S')
    .replace(/[Ö]/g, 'O')
    .replace(/[ö]/g, 'O')
    .replace(/[Ç]/g, 'C')
    .replace(/[ç]/g, 'C')
    .toUpperCase()
    .trim();
}

const DURUM_APP_TO_DB: Record<string, string> = {
  DEVAM_EDIYOR: 'DEVAM_EDİYOR',
  'DEVAM EDIYOR': 'DEVAM_EDİYOR',
  DEVAM_EDİYOR: 'DEVAM_EDİYOR',
  'PLANLANDI-RANDEVU': 'RANDEVU_VERILDI',
  PLANLANDI_RANDEVU: 'RANDEVU_VERILDI',
};

const DURUM_DB_TO_APP: Record<string, string> = {
  'DEVAM_EDİYOR': 'DEVAM_EDIYOR',
  DEVAM_EDIYOR: 'DEVAM_EDIYOR',
  'DEVAM EDIYOR': 'DEVAM_EDIYOR',
};

const ROLE_APP_TO_DB: Record<string, string> = {
  TEKNISYEN: 'YETKILI',
  TEKNIISYEN: 'YETKILI',
  YETKILI: 'YETKILI',
  ADMIN: 'ADMIN',
  MUSTERI: 'YETKILI',
};

const ROLE_DB_TO_APP: Record<string, string> = {
  TEKNIisyEN: 'YETKILI',
  TEKNISYEN: 'YETKILI',
  TEKNIISYEN: 'YETKILI',
  YETKILI: 'YETKILI',
  ADMIN: 'ADMIN',
  MUSTERI: 'YETKILI',
};

export function normalizeServisDurumuForDb(value: string): string {
  if (!value) return value;
  const key = normalizeKey(value);
  return DURUM_APP_TO_DB[key] ?? key;
}

export function normalizeServisDurumuForApp(value: string): string {
  if (!value) return value;
  const key = normalizeKey(value);
  return DURUM_DB_TO_APP[key] ?? key;
}

export type LokasyonGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

export function normalizeLokasyonText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')
    .trim();
}

export function getLokasyonGroupFromFields(yer?: unknown, adres?: unknown): LokasyonGroup {
  const normalizedYer = normalizeKey(normalizeLokasyonText(yer));
  const normalizedAdres = normalizeKey(normalizeLokasyonText(adres));
  const combined = `${normalizedYer} ${normalizedAdres}`;

  if (combined.includes('YATMARIN') || combined.includes('YATMARIN')) return 'YATMARIN';
  if (combined.includes('NETSEL')) return 'NETSEL';
  return 'DIS_SERVIS';
}

export function normalizeUserRoleForDb(value: string): string {
  if (!value) return value;
  const key = normalizeKey(value);
  return ROLE_APP_TO_DB[key] ?? value;
}

export function normalizeUserRoleForApp(value: string): string {
  if (!value) return value;
  const key = normalizeKey(value);
  return ROLE_DB_TO_APP[key] ?? value;
}

