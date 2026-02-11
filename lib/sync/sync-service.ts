import { ServisDurumu } from '@prisma/client';
import { z } from 'zod';
import { normalizeLokasyonText } from '@/lib/domain-mappers';
import { parseSmartDateToUtcDate } from './utils/smart-date-parser';
import { mapSheetStatusToDbStatus, shouldSkipIngestionStatus } from './utils/status-mapper';

const DEFAULT_STATUS = ServisDurumu.RANDEVU_VERILDI;

const PlanlamaIngestionInputSchema = z
  .object({
    id: z.unknown().optional(),
    tarih: z.unknown().optional(),
    saat: z.unknown().optional(),
    tekneAdi: z.unknown().optional(),
    adres: z.unknown().optional(),
    yer: z.unknown().optional(),
    servisAciklamasi: z.unknown().optional(),
    irtibatKisi: z.unknown().optional(),
    telefon: z.unknown().optional(),
    durum: z.unknown().optional(),
  })
  .passthrough();

const PlanlamaIngestionOutputSchema = z.object({
  id: z.string(),
  tarih: z.date().nullable(),
  saat: z.string().nullable(),
  tekneAdi: z.string(),
  adres: z.string(),
  yer: z.string(),
  servisAciklamasi: z.string(),
  irtibatKisi: z.string().nullable(),
  telefon: z.string().nullable(),
  durum: z.nativeEnum(ServisDurumu).default(DEFAULT_STATUS).catch(DEFAULT_STATUS),
  warnings: z.array(z.string()),
  skipReason: z.enum(['NONE', 'STATUS_FILTERED', 'MISSING_REQUIRED']),
});

export type SanitizedPlanlamaRow = z.infer<typeof PlanlamaIngestionOutputSchema>;

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toNullableTrimmedString(value: unknown): string | null {
  const normalized = toTrimmedString(value);
  return normalized.length ? normalized : null;
}

function normalizePhone(value: unknown): string | null {
  const normalized = toTrimmedString(value).replace(/\s+/g, ' ');
  return normalized.length ? normalized : null;
}

function resolveSkipReason(row: {
  tekneAdi: string;
  servisAciklamasi: string;
  durum: ServisDurumu;
}): SanitizedPlanlamaRow['skipReason'] {
  if (!row.tekneAdi || !row.servisAciklamasi) {
    return 'MISSING_REQUIRED';
  }

  if (shouldSkipIngestionStatus(row.durum)) {
    return 'STATUS_FILTERED';
  }

  return 'NONE';
}

export function sanitizePlanlamaRow(
  source: Record<string, unknown>,
  fallbackIdFactory: (row: Record<string, unknown>) => string
): SanitizedPlanlamaRow {
  const parsed = PlanlamaIngestionInputSchema.safeParse(source);
  const input = parsed.success ? parsed.data : {};

  const warnings: string[] = [];
  if (!parsed.success) {
    warnings.push('zod_input_parse_failed');
  }

  const dateResult = parseSmartDateToUtcDate(input.tarih);
  if (dateResult.usedFallback) {
    warnings.push(`date_fallback:${dateResult.source}`);
  }

  const statusResult = mapSheetStatusToDbStatus(input.durum);
  if (statusResult.usedFallback) {
    warnings.push(`status_fallback:${statusResult.token || 'EMPTY'}`);
  }

  const candidate = {
    id: toTrimmedString(input.id),
    tarih: dateResult.date,
    saat: toNullableTrimmedString(input.saat),
    tekneAdi: toTrimmedString(input.tekneAdi),
    adres: normalizeLokasyonText(input.adres),
    yer: normalizeLokasyonText(input.yer),
    servisAciklamasi: toTrimmedString(input.servisAciklamasi),
    irtibatKisi: toNullableTrimmedString(input.irtibatKisi),
    telefon: normalizePhone(input.telefon),
    durum: statusResult.status,
    warnings,
  };

  const id = candidate.id || fallbackIdFactory(candidate);
  const skipReason = resolveSkipReason({
    tekneAdi: candidate.tekneAdi,
    servisAciklamasi: candidate.servisAciklamasi,
    durum: candidate.durum,
  });

  const output = PlanlamaIngestionOutputSchema.parse({
    ...candidate,
    id,
    skipReason,
  });

  return output;
}
