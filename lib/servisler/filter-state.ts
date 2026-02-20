import { DataGridGroupBy, DEFAULT_STATUS_FILTERS, QueueFilter } from '@/components/services/types';

export type ServisDatePreset = 'ALL' | 'BUGUN' | 'YARIN' | 'BU_HAFTA';

export interface ServisFilterState {
  tekneAdi?: string;
  durum?: string[];
  konum?: string[];
  tarih?: string[];
  dateFrom?: string;
  dateTo?: string;
  teknisyen?: string[];
  oncelik?: string[];
  blokaj?: string[];
  queue?: QueueFilter;
  groupBy?: DataGridGroupBy;
  datePreset?: ServisDatePreset;
}

export const SERVIS_FILTER_STORAGE_KEY = 'servisler:filter-state:v1';

function uniqSorted(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  const normalized = Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
  if (normalized.length === 0) return undefined;
  return normalized.sort((a, b) => a.localeCompare(b, 'tr-TR'));
}

function normalizeQueue(value: string | undefined): QueueFilter | undefined {
  if (!value) return undefined;
  const allowed: QueueFilter[] = ['ALL', 'ACTIVE', 'OVERDUE', 'UNASSIGNED', 'UNSCHEDULED', 'WAITING'];
  return allowed.includes(value as QueueFilter) ? (value as QueueFilter) : undefined;
}

function normalizeGroupBy(value: string | undefined): DataGridGroupBy | undefined {
  if (!value) return undefined;
  if (value === 'none' || value === 'tekneAdi' || value === 'lokasyonGroup') return value;
  return undefined;
}

function normalizeDatePreset(value: string | undefined): ServisDatePreset | undefined {
  if (!value) return undefined;
  if (value === 'ALL' || value === 'BUGUN' || value === 'YARIN' || value === 'BU_HAFTA') return value;
  return undefined;
}

function areArraysEqual(left: string[] | undefined, right: readonly string[]): boolean {
  if (!left || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function normalizeServisFilterState(state: ServisFilterState): ServisFilterState {
  const tekneAdi = state.tekneAdi?.trim() || undefined;
  const durum = uniqSorted(state.durum);
  const konum = uniqSorted(state.konum);
  const tarih = uniqSorted(state.tarih);
  const dateFrom = state.dateFrom?.trim() || undefined;
  const dateTo = state.dateTo?.trim() || undefined;
  const teknisyen = uniqSorted(state.teknisyen);
  const oncelik = uniqSorted(state.oncelik);
  const blokaj = uniqSorted(state.blokaj);
  const queue = normalizeQueue(state.queue);
  const groupBy = normalizeGroupBy(state.groupBy);
  const datePreset = normalizeDatePreset(state.datePreset);

  const normalized: ServisFilterState = {};

  if (tekneAdi) normalized.tekneAdi = tekneAdi;
  if (durum && !areArraysEqual(durum, DEFAULT_STATUS_FILTERS)) normalized.durum = durum;
  if (konum) normalized.konum = konum;
  if (tarih) normalized.tarih = tarih;
  if (dateFrom) normalized.dateFrom = dateFrom;
  if (dateTo) normalized.dateTo = dateTo;
  if (teknisyen) normalized.teknisyen = teknisyen;
  if (oncelik) normalized.oncelik = oncelik;
  if (blokaj) normalized.blokaj = blokaj;
  if (queue && queue !== 'ALL') normalized.queue = queue;
  if (groupBy && groupBy !== 'none') normalized.groupBy = groupBy;
  if (datePreset && datePreset !== 'ALL') normalized.datePreset = datePreset;

  return normalized;
}

export function saveServisFilterStateToStorage(state: ServisFilterState): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeServisFilterState(state);
  window.localStorage.setItem(SERVIS_FILTER_STORAGE_KEY, JSON.stringify(normalized));
}

export function loadServisFilterStateFromStorage(): ServisFilterState | null {
  if (typeof window === 'undefined') return null;
  const rawValue = window.localStorage.getItem(SERVIS_FILTER_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as ServisFilterState;
    return normalizeServisFilterState(parsed);
  } catch {
    return null;
  }
}

