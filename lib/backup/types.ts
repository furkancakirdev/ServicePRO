export type YedekTuru = 'manuel' | 'otomatik';

export type JsonIlkel = string | number | boolean | null;
export type JsonDeger = JsonIlkel | JsonDeger[] | { [anahtar: string]: JsonDeger };
export type JsonNesne = Record<string, JsonDeger>;

export interface VeritabaniYedekSonucu {
  tablolar: string[];
  toplamKayit: number;
  veriler: Record<string, JsonNesne[]>;
}

export interface SheetsConflictKaydi {
  id: string;
  status: string;
  errors: string;
  createdAt: string;
}

export interface SheetsYedekSonucu {
  syncLog: JsonNesne[];
  conflictLoglari: SheetsConflictKaydi[];
}

export interface KonfigYedekSonucu {
  ayarlar: JsonNesne[];
  cevreDegiskenleri: Record<string, string>;
}

export interface YedekMetadata {
  recordCount: number;
  tables: string[];
}

export interface YedekIcerigi {
  version: '1.0';
  timestamp: string;
  type: YedekTuru;
  metadata: YedekMetadata;
  data: Record<string, JsonNesne[]>;
  sheets: SheetsYedekSonucu;
  config: KonfigYedekSonucu;
}

export interface YedekListeElemani {
  id: string;
  dosyaAdi: string;
  dosyaYolu: string;
  tarih: string;
  tur: YedekTuru;
  boyutBayt: number;
  boyut: string;
  durum: 'tamamlandi' | 'hatali';
  kayitSayisi: number;
  metadata: YedekMetadata;
}

function jsonFonksiyonuOlanNesne(
  deger: object
): deger is { toJSON: () => unknown } {
  if (!('toJSON' in deger)) return false;
  const aday = deger as { toJSON?: unknown };
  return typeof aday.toJSON === 'function';
}

export function guvenliJsonDegeri(deger: unknown): JsonDeger {
  if (deger === null) return null;

  if (
    typeof deger === 'string' ||
    typeof deger === 'number' ||
    typeof deger === 'boolean'
  ) {
    return deger;
  }

  if (typeof deger === 'bigint') {
    return deger.toString();
  }

  if (deger instanceof Date) {
    return deger.toISOString();
  }

  if (Array.isArray(deger)) {
    return deger.map((oge) => guvenliJsonDegeri(oge));
  }

  if (typeof deger === 'object') {
    if (jsonFonksiyonuOlanNesne(deger)) {
      return guvenliJsonDegeri(deger.toJSON());
    }

    const sonuc: Record<string, JsonDeger> = {};
    for (const [anahtar, altDeger] of Object.entries(deger)) {
      sonuc[anahtar] = guvenliJsonDegeri(altDeger);
    }
    return sonuc;
  }

  return null;
}

export function guvenliJsonNesnesi(deger: unknown): JsonNesne {
  const jsonDegeri = guvenliJsonDegeri(deger);
  if (jsonDegeri === null || Array.isArray(jsonDegeri)) {
    return {};
  }

  if (typeof jsonDegeri !== 'object') {
    return {};
  }

  return jsonDegeri;
}
