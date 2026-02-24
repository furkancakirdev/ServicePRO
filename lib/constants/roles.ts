/**
 * Role and Title Constants
 * Centralized constants to eliminate hardcoded values across components.
 */

// Personnel Roles
export const PERSONEL_ROLES = {
  TEKNISYEN: 'teknisyen',
  YETKILI: 'yetkili',
} as const;

export type PersonelRole = typeof PERSONEL_ROLES[keyof typeof PERSONEL_ROLES];

// Personnel Titles (Unvan)
export const PERSONEL_UNVAN = {
  USTA: 'usta',
  CIRAK: 'cirak',
  YONETICI: 'yonetici',
  OFIS: 'ofis',
} as const;

export type PersonelUnvan = typeof PERSONEL_UNVAN[keyof typeof PERSONEL_UNVAN];

// Technician roles (combining role + unvan)
export const TEKNIKSYEN_ROLES = [PERSONEL_ROLES.TEKNISYEN] as const;

// Technician titles (for filtering)
export const TEKNIKSYEN_UNVANLAR = [
  PERSONEL_UNVAN.USTA,
  PERSONEL_UNVAN.CIRAK,
] as const;

// Helper function to check if a personel is a technician
export function isTeknisyen(rol: string, unvan: string): boolean {
  return (
    rol === PERSONEL_ROLES.TEKNISYEN &&
    (unvan === PERSONEL_UNVAN.USTA || unvan === PERSONEL_UNVAN.CIRAK)
  );
}

// Display labels for UI
export const PERSONEL_ROLE_LABELS: Record<PersonelRole, string> = {
  [PERSONEL_ROLES.TEKNISYEN]: 'Teknisyen',
  [PERSONEL_ROLES.YETKILI]: 'Yetkili',
};

export const PERSONEL_UNVAN_LABELS: Record<PersonelUnvan, string> = {
  [PERSONEL_UNVAN.USTA]: 'Usta',
  [PERSONEL_UNVAN.CIRAK]: 'Çırak',
  [PERSONEL_UNVAN.YONETICI]: 'Yönetici',
  [PERSONEL_UNVAN.OFIS]: 'Ofis',
};

// Tab options for personnel filtering
export const PERSONEL_TAB_OPTIONS = {
  USTA: 'usta',
  CIRAK: 'cirak',
} as const;

export type PersonelTabOption = typeof PERSONEL_TAB_OPTIONS[keyof typeof PERSONEL_TAB_OPTIONS];
