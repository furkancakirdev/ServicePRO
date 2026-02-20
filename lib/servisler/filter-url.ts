import { DataGridGroupBy, QueueFilter } from '@/components/services/types';
import {
  normalizeServisFilterState,
  ServisFilterState,
} from '@/lib/servisler/filter-state';

type QueryLike = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function splitCommaValues(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseQueueFilter(value: string | undefined): QueueFilter | undefined {
  switch (value) {
    case 'ACTIVE':
    case 'OVERDUE':
    case 'UNASSIGNED':
    case 'UNSCHEDULED':
    case 'WAITING':
    case 'ALL':
      return value;
    default:
      return undefined;
  }
}

function parseGroupBy(value: string | undefined): DataGridGroupBy | undefined {
  if (value === 'none' || value === 'tekneAdi' || value === 'lokasyonGroup') {
    return value;
  }
  return undefined;
}

function joinCsv(values: string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.join(',');
}

export function parseServisFilterStateFromSearchParams(
  searchParams: QueryLike
): ServisFilterState {
  const tekneAdi = (searchParams.search ?? searchParams.arama ?? '').toString().trim() || undefined;
  const durum = splitCommaValues(toArray(searchParams.durum));
  const konum = splitCommaValues(toArray(searchParams.adresGroup));
  const tarih = splitCommaValues([...toArray(searchParams.tarih), ...toArray(searchParams.date)]);
  const queue = parseQueueFilter(
    typeof searchParams.queue === 'string' ? searchParams.queue : undefined
  );
  const groupBy = parseGroupBy(
    typeof searchParams.groupBy === 'string' ? searchParams.groupBy : undefined
  );
  const datePresetRaw =
    typeof searchParams.preset === 'string' ? searchParams.preset : undefined;
  const datePreset =
    datePresetRaw === 'ALL' ||
    datePresetRaw === 'BUGUN' ||
    datePresetRaw === 'YARIN' ||
    datePresetRaw === 'BU_HAFTA'
      ? datePresetRaw
      : undefined;

  return normalizeServisFilterState({
    tekneAdi,
    durum,
    konum,
    tarih,
    queue,
    groupBy,
    datePreset,
  });
}

export function serializeServisFilterStateToSearchParams(
  state: ServisFilterState
): URLSearchParams {
  const normalized = normalizeServisFilterState(state);
  const params = new URLSearchParams();

  if (normalized.tekneAdi) params.set('search', normalized.tekneAdi);

  const durumCsv = joinCsv(normalized.durum);
  if (durumCsv) params.set('durum', durumCsv);

  const konumCsv = joinCsv(normalized.konum);
  if (konumCsv) params.set('adresGroup', konumCsv);

  const tarihCsv = joinCsv(normalized.tarih);
  if (tarihCsv) params.set('tarih', tarihCsv);

  if (normalized.queue) params.set('queue', normalized.queue);
  if (normalized.groupBy) params.set('groupBy', normalized.groupBy);
  if (normalized.datePreset) params.set('preset', normalized.datePreset);

  return params;
}

export function buildServisUrlFromFilterState(
  pathname: string,
  state: ServisFilterState
): string {
  const params = serializeServisFilterStateToSearchParams(state);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function hasServisFilterParams(params: URLSearchParams): boolean {
  const keys = ['search', 'arama', 'durum', 'adresGroup', 'tarih', 'date', 'queue', 'groupBy', 'preset'];
  return keys.some((key) => params.has(key));
}
