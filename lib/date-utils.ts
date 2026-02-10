const DD_MM_YYYY = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/;
const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})/;
const NUMERIC_VALUE = /^-?\d+(\.\d+)?$/;

// Google Sheets / Excel serial date epoch (accounts for Excel's 1900 leap-year behavior).
const SHEETS_SERIAL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SHEETS_SERIAL_MIN = 20000; // ~1954
const SHEETS_SERIAL_MAX = 100000; // ~2173

type DateParts = { year: number; month: number; day: number };

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  return year <= 69 ? 2000 + year : 1900 + year;
}

function isValidParts(parts: DateParts): boolean {
  const { year, month, day } = parts;
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseSheetsSerialDateParts(value: unknown): DateParts | null {
  const raw = String(value ?? "").trim();
  if (!raw || !NUMERIC_VALUE.test(raw)) return null;

  const serial = Number(raw);
  if (!Number.isFinite(serial)) return null;

  // Guard against mistaking plain year-like numeric text (e.g. "2024") for serial dates.
  if (serial < SHEETS_SERIAL_MIN || serial > SHEETS_SERIAL_MAX) return null;

  const wholeDays = Math.floor(serial);
  const date = new Date(SHEETS_SERIAL_EPOCH_UTC + wholeDays * MS_PER_DAY);
  if (Number.isNaN(date.getTime())) return null;

  const parts = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };

  return isValidParts(parts) ? parts : null;
}

export function parseDateOnlyParts(value: unknown): DateParts | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
    };
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const dmyMatch = raw.match(DD_MM_YYYY);
  if (dmyMatch) {
    const parts = {
      day: Number(dmyMatch[1]),
      month: Number(dmyMatch[2]),
      year: normalizeYear(Number(dmyMatch[3])),
    };
    return isValidParts(parts) ? parts : null;
  }

  const ymdMatch = raw.match(YYYY_MM_DD);
  if (ymdMatch) {
    const parts = {
      year: Number(ymdMatch[1]),
      month: Number(ymdMatch[2]),
      day: Number(ymdMatch[3]),
    };
    return isValidParts(parts) ? parts : null;
  }

  const serialParts = parseSheetsSerialDateParts(value);
  if (serialParts) return serialParts;

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;
  const parts = {
    year: fallback.getUTCFullYear(),
    month: fallback.getUTCMonth() + 1,
    day: fallback.getUTCDate(),
  };
  return isValidParts(parts) ? parts : null;
}

export function parseDateOnlyToUtcDate(value: unknown): Date | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;

  // Noon UTC avoids timezone-driven date underflow/overflow in UI rendering.
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
}

export function toDateOnlyISO(value: unknown): string | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

export function formatDateOnlyTR(value: unknown): string {
  const parts = parseDateOnlyParts(value);
  if (!parts) return "Geçersiz tarih";

  return `${parts.day.toString().padStart(2, "0")}.${parts.month
    .toString()
    .padStart(2, "0")}.${parts.year}`;
}

export function createUtcDayRange(dateInput: string): { start: Date; end: Date } | null {
  const parts = parseDateOnlyParts(dateInput);
  if (!parts) return null;
  return {
    start: new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59, 999)),
  };
}
