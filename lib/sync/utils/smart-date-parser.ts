const DD_MM_YYYY_RE = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/;
const YYYY_MM_DD_RE = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

const SERIAL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SERIAL_MIN = 20000;
const SERIAL_MAX = 100000;

const MONTHS_TR_EN: Record<string, number> = {
  ocak: 1,
  january: 1,
  subat: 2,
  february: 2,
  mart: 3,
  march: 3,
  nisan: 4,
  april: 4,
  mayis: 5,
  may: 5,
  haziran: 6,
  june: 6,
  temmuz: 7,
  july: 7,
  agustos: 8,
  august: 8,
  eylul: 9,
  september: 9,
  ekim: 10,
  october: 10,
  kasim: 11,
  november: 11,
  aralik: 12,
  december: 12,
};

type SmartDateSource =
  | 'empty'
  | 'date_object'
  | 'excel_serial'
  | 'dd_mm_yyyy'
  | 'yyyy_mm_dd'
  | 'text_month'
  | 'native'
  | 'invalid';

export interface SmartDateParseResult {
  date: Date | null;
  source: SmartDateSource;
  raw: string;
  usedFallback: boolean;
}

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ı]/g, 'i')
    .replace(/[i̇]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ş]/g, 's')
    .replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year <= 69 ? 2000 + year : 1900 + year;
}

function isValidDateParts(parts: DateParts): boolean {
  const { year, month, day } = parts;
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const candidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function toUtcDate(parts: DateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

function parseExcelSerialDate(raw: string): DateParts | null {
  if (!NUMERIC_RE.test(raw)) return null;
  const serial = Number(raw);
  if (!Number.isFinite(serial) || serial < SERIAL_MIN || serial > SERIAL_MAX) {
    return null;
  }

  const wholeDays = Math.floor(serial);
  const date = new Date(SERIAL_EPOCH_UTC + wholeDays * MS_PER_DAY);
  if (Number.isNaN(date.getTime())) return null;

  const parts: DateParts = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };

  return isValidDateParts(parts) ? parts : null;
}

function parseDelimitedDate(raw: string): { parts: DateParts; source: SmartDateSource } | null {
  const dmy = raw.match(DD_MM_YYYY_RE);
  if (dmy) {
    const parts: DateParts = {
      day: Number(dmy[1]),
      month: Number(dmy[2]),
      year: normalizeYear(Number(dmy[3])),
    };
    if (isValidDateParts(parts)) {
      return { parts, source: 'dd_mm_yyyy' };
    }
  }

  const ymd = raw.match(YYYY_MM_DD_RE);
  if (ymd) {
    const parts: DateParts = {
      year: Number(ymd[1]),
      month: Number(ymd[2]),
      day: Number(ymd[3]),
    };
    if (isValidDateParts(parts)) {
      return { parts, source: 'yyyy_mm_dd' };
    }
  }

  return null;
}

function parseTextMonthDate(raw: string): DateParts | null {
  const normalized = normalizeToken(raw);
  if (!normalized) return null;

  const dayFirst = normalized.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{2,4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = MONTHS_TR_EN[dayFirst[2]];
    const year = normalizeYear(Number(dayFirst[3]));
    if (!month) return null;
    const parts: DateParts = { day, month, year };
    return isValidDateParts(parts) ? parts : null;
  }

  const monthFirst = normalized.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{2,4})$/);
  if (monthFirst) {
    const month = MONTHS_TR_EN[monthFirst[1]];
    const day = Number(monthFirst[2]);
    const year = normalizeYear(Number(monthFirst[3]));
    if (!month) return null;
    const parts: DateParts = { day, month, year };
    return isValidDateParts(parts) ? parts : null;
  }

  return null;
}

function parseDateFromNative(raw: string): DateParts | null {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const parts: DateParts = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };

  return isValidDateParts(parts) ? parts : null;
}

export function parseSmartDateToUtcDate(value: unknown): SmartDateParseResult {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const parts: DateParts = {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };

    if (isValidDateParts(parts)) {
      return {
        date: toUtcDate(parts),
        source: 'date_object',
        raw: value.toISOString(),
        usedFallback: false,
      };
    }
  }

  const raw = String(value ?? '').trim();
  if (!raw) {
    return {
      date: null,
      source: 'empty',
      raw,
      usedFallback: true,
    };
  }

  const serialParts = parseExcelSerialDate(raw);
  if (serialParts) {
    return {
      date: toUtcDate(serialParts),
      source: 'excel_serial',
      raw,
      usedFallback: false,
    };
  }

  const delimited = parseDelimitedDate(raw);
  if (delimited) {
    return {
      date: toUtcDate(delimited.parts),
      source: delimited.source,
      raw,
      usedFallback: false,
    };
  }

  const textMonthParts = parseTextMonthDate(raw);
  if (textMonthParts) {
    return {
      date: toUtcDate(textMonthParts),
      source: 'text_month',
      raw,
      usedFallback: false,
    };
  }

  const nativeParts = parseDateFromNative(raw);
  if (nativeParts) {
    return {
      date: toUtcDate(nativeParts),
      source: 'native',
      raw,
      usedFallback: false,
    };
  }

  return {
    date: null,
    source: 'invalid',
    raw,
    usedFallback: true,
  };
}

export function toDateOnlyKey(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}
