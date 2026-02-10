// ==================== SHEET CONFIGURATIONS ====================
// ServicePro ERP - Google Sheets Sheet Definitions and Column Mappings

import type { SheetConfig, ColumnMapping } from './types';
import { TRANSFORMS, SYNC_STRATEGIES } from './types';
import type { ServisDurumu, IsTuru } from '@/types';

export const DURUM_ENUM: Record<string, ServisDurumu> = {
  RANDEVU_VERILDI: 'RANDEVU_VERILDI',
  'PLANLANDI-RANDEVU': 'RANDEVU_VERILDI',
  RANDEVUV: 'RANDEVU_VERILDI',
  DEVAM_EDIYOR: 'DEVAM_EDIYOR',
  DEVAM_EDİYOR: 'DEVAM_EDIYOR',
  'DEVAM EDIYOR': 'DEVAM_EDIYOR',
  DEVAM: 'DEVAM_EDIYOR',
  PARCA_BEKLIYOR: 'PARCA_BEKLIYOR',
  'PARCA BEKLIYOR': 'PARCA_BEKLIYOR',
  PARCA: 'PARCA_BEKLIYOR',
  MUSTERI_ONAY_BEKLIYOR: 'MUSTERI_ONAY_BEKLIYOR',
  'MUSTERI ONAY BEKLIYOR': 'MUSTERI_ONAY_BEKLIYOR',
  MUSTERI: 'MUSTERI_ONAY_BEKLIYOR',
  RAPOR_BEKLIYOR: 'RAPOR_BEKLIYOR',
  RAPOR: 'RAPOR_BEKLIYOR',
  KESIF_KONTROL: 'KESIF_KONTROL',
  KESIF: 'KESIF_KONTROL',
  TAMAMLANDI: 'TAMAMLANDI',
  TAMAM: 'TAMAMLANDI',
  IPTAL: 'IPTAL',
  ERTELENDI: 'ERTELENDI',
};

export const IS_TURU_ENUM: Record<string, IsTuru> = {
  PAKET: 'PAKET',
  ARIZA: 'ARIZA',
  PROJE: 'PROJE',
};

export const UNVAN_ENUM: Record<string, string> = {
  USTA: 'USTA',
  USTABASI: 'USTA',
  TEKNISYEN: 'USTA',
  CIRAK: 'CIRAK',
  YONETICI: 'YONETICI',
  OFIS: 'OFIS',
};

const ROL_ENUM: Record<string, string> = {
  TEKNISYEN: 'teknisyen',
  YETKILI: 'yetkili',
  YONETICI: 'yetkili',
};

const ROL_PERSONEL_ENUM: Record<string, string> = {
  SORUMLU: 'SORUMLU',
  DESTEK: 'DESTEK',
};

const ROZET_ENUM: Record<string, string> = {
  ALTIN: 'ALTIN',
  GUMUS: 'GUMUS',
  BRONZ: 'BRONZ',
};

function createColumnMapping(
  dbField: string,
  sheetColumn: string,
  type: ColumnMapping['type'],
  required: boolean,
  options: {
    enumValues?: Record<string, string>;
    transform?: (value: string) => unknown;
    headerAliases?: string[];
  } = {}
): ColumnMapping {
  return {
    dbField,
    sheetColumn,
    type,
    required,
    enumValues: options.enumValues,
    transform: options.transform,
    headerAliases: options.headerAliases,
  };
}

export const SHEETS_CONFIG: Record<string, SheetConfig> = {
  PLANLAMA: {
    sheetName: 'DB_Planlama',
    range: 'A:J',
    primaryKey: 'sheetRowKey',
    syncStrategy: 'DB_FIRST',
    enableSoftDelete: true,
    timestamps: {
      createdAt: 'A',
      updatedAt: 'A',
    },
    columns: [
      createColumnMapping('tarih', 'A', 'date', true, { transform: TRANSFORMS.toDate, headerAliases: ['tarih', 'date'] }),
      createColumnMapping('saat', 'B', 'string', false, { headerAliases: ['saat', 'time'] }),
      createColumnMapping('tekneAdi', 'C', 'string', true, { headerAliases: ['tekne adi', 'tekneadi', 'boat name'] }),
      createColumnMapping('adres', 'D', 'string', true, { headerAliases: ['adres', 'address'] }),
      createColumnMapping('yer', 'E', 'string', false, { headerAliases: ['yer', 'lokasyon', 'location'] }),
      createColumnMapping('servisAciklamasi', 'F', 'string', true, { headerAliases: ['servis aciklamasi', 'aciklama', 'description'] }),
      createColumnMapping('irtibatKisi', 'G', 'string', false, { headerAliases: ['irtibat kisi', 'irtibat', 'contact'] }),
      createColumnMapping('telefon', 'H', 'string', false, { headerAliases: ['telefon', 'phone'] }),
      createColumnMapping('durum', 'I', 'enum', true, {
        enumValues: DURUM_ENUM,
        transform: (v: string) => TRANSFORMS.toEnum(v, DURUM_ENUM),
        headerAliases: ['durum', 'status'],
      }),
      createColumnMapping('whatsappDurumu', 'J', 'string', false, { headerAliases: ['whatsapp randevu bildirimi gonder'] }),
    ],
  },

  PERSONEL: {
    sheetName: 'Personel_Listesi',
    range: 'A:M',
    primaryKey: 'id',
    syncStrategy: 'DB_FIRST',
    enableSoftDelete: false,
    timestamps: {
      createdAt: 'K',
      updatedAt: 'L',
    },
    columns: [
      createColumnMapping('id', 'A', 'string', true),
      createColumnMapping('ad', 'B', 'string', true),
      createColumnMapping('unvan', 'C', 'enum', true, {
        enumValues: UNVAN_ENUM,
        transform: (v: string) => TRANSFORMS.toEnum(v, UNVAN_ENUM),
      }),
      createColumnMapping('rol', 'D', 'string', true, {
        transform: (v: string) => ROL_ENUM[TRANSFORMS.normalizeText(v).toUpperCase()] || v.toLowerCase(),
      }),
      createColumnMapping('aktif', 'E', 'boolean', true, { transform: TRANSFORMS.toBoolean }),
      createColumnMapping('girisYili', 'F', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('telefon', 'G', 'string', false),
      createColumnMapping('email', 'H', 'string', false),
      createColumnMapping('adres', 'I', 'string', false),
      createColumnMapping('aciklama', 'J', 'string', false),
      createColumnMapping('olusturmaTarihi', 'K', 'datetime', false, { transform: TRANSFORMS.toDateTime }),
      createColumnMapping('guncellestirmeTarihi', 'L', 'datetime', false, { transform: TRANSFORMS.toDateTime }),
    ],
  },

  TEKNELER: {
    sheetName: 'Tekneler',
    range: 'A:R',
    primaryKey: 'id',
    syncStrategy: 'DB_FIRST',
    enableSoftDelete: false,
    timestamps: {
      createdAt: 'Q',
      updatedAt: 'R',
    },
    columns: [
      createColumnMapping('id', 'A', 'string', true),
      createColumnMapping('ad', 'B', 'string', true),
      createColumnMapping('seriNo', 'C', 'string', false),
      createColumnMapping('marka', 'D', 'string', false),
      createColumnMapping('model', 'E', 'string', false),
      createColumnMapping('boyut', 'F', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('motorTipi', 'G', 'string', false),
      createColumnMapping('motorSeriNo', 'H', 'string', false),
      createColumnMapping('yil', 'I', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('renk', 'J', 'string', false),
      createColumnMapping('mulkiyet', 'K', 'string', false),
      createColumnMapping('adres', 'L', 'string', false),
      createColumnMapping('telefon', 'M', 'string', false),
      createColumnMapping('email', 'N', 'string', false),
      createColumnMapping('aciklama', 'O', 'string', false),
      createColumnMapping('aktif', 'P', 'boolean', true, { transform: TRANSFORMS.toBoolean }),
      createColumnMapping('olusturmaTarihi', 'Q', 'datetime', false, { transform: TRANSFORMS.toDateTime }),
      createColumnMapping('guncellestirmeTarihi', 'R', 'datetime', false, { transform: TRANSFORMS.toDateTime }),
    ],
  },

  PUANLAMA: {
    sheetName: 'Puanlama',
    range: 'A:N',
    primaryKey: 'id',
    syncStrategy: 'DB_FIRST',
    enableSoftDelete: false,
    timestamps: {
      createdAt: 'M',
      updatedAt: 'M',
    },
    columns: [
      createColumnMapping('id', 'A', 'string', true),
      createColumnMapping('servisId', 'B', 'string', true),
      createColumnMapping('personelId', 'C', 'string', true),
      createColumnMapping('personelAd', 'D', 'string', true),
      createColumnMapping('rol', 'E', 'enum', true, {
        enumValues: ROL_PERSONEL_ENUM,
        transform: (v: string) => ROL_PERSONEL_ENUM[TRANSFORMS.normalizeText(v).toUpperCase()] || v,
      }),
      createColumnMapping('isTuru', 'F', 'enum', true, {
        enumValues: IS_TURU_ENUM,
        transform: (v: string) => TRANSFORMS.toEnum(v, IS_TURU_ENUM),
      }),
      createColumnMapping('raporBasarisi', 'G', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('hamPuan', 'H', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('zorlukCarpani', 'I', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('finalPuan', 'J', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('bonus', 'K', 'boolean', false, { transform: TRANSFORMS.toBoolean }),
      createColumnMapping('notlar', 'L', 'string', false),
      createColumnMapping('tarih', 'M', 'datetime', false, { transform: TRANSFORMS.toDateTime }),
    ],
  },

  AYLIK_OZET: {
    sheetName: 'Aylik_Ozet',
    range: 'A:N',
    primaryKey: 'id',
    syncStrategy: 'DB_FIRST',
    enableSoftDelete: false,
    timestamps: {
      createdAt: 'N',
      updatedAt: 'N',
    },
    columns: [
      createColumnMapping('id', 'A', 'string', true),
      createColumnMapping('personelId', 'B', 'string', true),
      createColumnMapping('personelAd', 'C', 'string', true),
      createColumnMapping('ay', 'D', 'string', true),
      createColumnMapping('servisSayisi', 'E', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('sorumluServis', 'F', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('destekServis', 'G', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('bireyselPuanOrt', 'H', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('yetkiliPuanOrt', 'I', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('ismailPuani', 'J', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('toplamPuan', 'K', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('siralama', 'L', 'number', false, { transform: TRANSFORMS.toNumber }),
      createColumnMapping('rozet', 'M', 'enum', false, {
        enumValues: ROZET_ENUM,
        transform: (v: string) => ROZET_ENUM[TRANSFORMS.normalizeText(v).toUpperCase()] || null,
      }),
    ],
  },
};

export type SheetKey = keyof typeof SHEETS_CONFIG;

export const SHEET_NAMES = {
  PLANLAMA: 'DB_Planlama',
  PERSONEL: 'Personel_Listesi',
  TEKNELER: 'Tekneler',
  PUANLAMA: 'Puanlama',
  AYLIK_OZET: 'Aylik_Ozet',
  LOGS: 'DB_Logs',
} as const;

export const DEFAULT_SYNC_OPTIONS = {
  timeoutMs: 60000,
  maxRetries: 3,
  retryDelayMs: 1000,
  batchSize: 100,
  rateLimitDelayMs: 100,
};

export function getSheetConfig(sheetKey: keyof typeof SHEETS_CONFIG): SheetConfig {
  const config = SHEETS_CONFIG[sheetKey];
  if (!config) throw new Error(`Sheet configuration not found for key: ${sheetKey}`);
  return config;
}

export function getSheetConfigByName(sheetName: string): SheetConfig | null {
  return Object.values(SHEETS_CONFIG).find(config => config.sheetName === sheetName) || null;
}

export function getAllSheetConfigs(): SheetConfig[] {
  return Object.values(SHEETS_CONFIG);
}

export function getSyncStrategy(sheetKey: keyof typeof SHEETS_CONFIG) {
  const config = SHEETS_CONFIG[sheetKey];
  return SYNC_STRATEGIES[config.syncStrategy];
}

export const SHEET_TO_MODEL_MAP: Record<string, string> = {
  PLANLAMA: 'service',
  PERSONEL: 'personel',
  TEKNELER: 'tekne',
  PUANLAMA: 'servisPuan',
  AYLIK_OZET: 'aylikPerformans',
};

export const SHEET_KEY_TO_NAME: Record<string, string> = {
  PLANLAMA: SHEET_NAMES.PLANLAMA,
  PERSONEL: SHEET_NAMES.PERSONEL,
  TEKNELER: SHEET_NAMES.TEKNELER,
  PUANLAMA: SHEET_NAMES.PUANLAMA,
  AYLIK_OZET: SHEET_NAMES.AYLIK_OZET,
};

