const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export const TR_TIME_ZONE = 'Europe/Istanbul';

function toPartsMap(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type === 'literal') continue;
    map[part.type] = part.value;
  }
  return map;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = toPartsMap(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

export function parseDateTimeInputInTimeZone(
  value: string,
  timeZone: string = TR_TIME_ZONE
): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = raw.match(DATE_TIME_INPUT_PATTERN);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '00'] = match;
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const result = new Date(utcGuess - offset);

  return Number.isNaN(result.getTime()) ? null : result;
}

export function toDateTimeInputInTimeZone(
  value: Date | string,
  timeZone: string = TR_TIME_ZONE
): string {
  const source = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(source.getTime())) return '';
  const parts = toPartsMap(source, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatDateTimeForUi(
  value: Date | string,
  timeZone: string = TR_TIME_ZONE
): string {
  const source = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(source.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(source);
}
