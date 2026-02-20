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

function getStringParam(
  params: QueryLike,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function getArrayParam(
  params: QueryLike,
  ...keys: string[]
): string[] {
  return splitCommaValues(
    keys.flatMap((key) => toArray(params[key]))
  );
}

export function parseServisFilterStateFromSearchParams(
  searchParams: QueryLike
): ServisFilterState {
  const tekneAdi = getStringParam(searchParams, 'q', 'search', 'arama');
  const durum = getArrayParam(searchParams, 'status', 'durum');
  const konum = getArrayParam(searchParams, 'lokasyon', 'konum', 'adresGroup');
  const tarih = getArrayParam(searchParams, 'tarih', 'date');
  const teknisyen = getArrayParam(searchParams, 'technician', 'teknisyen');
  const oncelik = getArrayParam(searchParams, 'priority', 'oncelik');
  const blokaj = getArrayParam(searchParams, 'blockingReason', 'blokaj');
  const dateFrom = getStringParam(searchParams, 'from', 'dateFrom');
  const dateTo = getStringParam(searchParams, 'to', 'dateTo');
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
    dateFrom,
    dateTo,
    teknisyen,
    oncelik,
    blokaj,
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

  if (normalized.tekneAdi) {
    params.set('q', normalized.tekneAdi);
    // Keep legacy key for backward-compatible deep links and test flows.
    params.set('search', normalized.tekneAdi);
  }

  const durumCsv = joinCsv(normalized.durum);
  if (durumCsv) params.set('status', durumCsv);

  const konumCsv = joinCsv(normalized.konum);
  if (konumCsv) params.set('lokasyon', konumCsv);

  const tarihCsv = joinCsv(normalized.tarih);
  if (tarihCsv) params.set('tarih', tarihCsv);

  if (normalized.dateFrom) params.set('from', normalized.dateFrom);
  if (normalized.dateTo) params.set('to', normalized.dateTo);

  const technicianCsv = joinCsv(normalized.teknisyen);
  if (technicianCsv) params.set('technician', technicianCsv);

  const priorityCsv = joinCsv(normalized.oncelik);
  if (priorityCsv) params.set('priority', priorityCsv);

  const blockingCsv = joinCsv(normalized.blokaj);
  if (blockingCsv) params.set('blockingReason', blockingCsv);

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
  const keys = [
    'q',
    'search',
    'arama',
    'status',
    'durum',
    'lokasyon',
    'konum',
    'adresGroup',
    'tarih',
    'date',
    'from',
    'to',
    'dateFrom',
    'dateTo',
    'technician',
    'teknisyen',
    'priority',
    'oncelik',
    'blockingReason',
    'blokaj',
    'queue',
    'groupBy',
    'preset',
  ];
  return keys.some((key) => params.has(key));
}
