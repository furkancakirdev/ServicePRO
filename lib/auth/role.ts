export type CanonicalRole = 'ADMIN' | 'YETKILI';

const ROLE_ALIASES: Record<string, CanonicalRole> = {
  ADMIN: 'ADMIN',
  YETKILI: 'YETKILI',
  TEKNISYEN: 'YETKILI',
  TEKNIISYEN: 'YETKILI',
  MUSTERI: 'YETKILI',
};

export function normalizeRole(value: string | null | undefined): CanonicalRole | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return ROLE_ALIASES[normalized] ?? null;
}

