'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  GroupingState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DatePreset, DatePresetFilter } from '@/components/table/date-preset-filter';
import { SavedFilters } from '@/components/servisler/SavedFilters';
import { DataTableToolbar } from './data-table-toolbar';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import {
  ACTIVE_STATUS_VALUES,
  DEFAULT_STATUS_FILTERS,
  PRIORITY_FILTER_OPTIONS,
  QueueFilter,
  ServiceGridInitialState,
  ServiceGridRow,
  ServiceGridServerPagination,
  ServiceLocationOption,
  ServiceStatusOption,
  ServiceTableMeta,
  ServiceViewPreset,
  STATUS_FILTER_OPTIONS,
} from './types';
import { getStatusConfig } from '@/lib/config/status-config';
import {
  formatDateDdmmyyyShortMonth,
  isDateBeforeTodayUtc,
  parseDateOnlyToUtcDate,
} from '@/lib/date-utils';
import { normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import {
  loadServisFilterStateFromStorage,
  normalizeServisFilterState,
  saveServisFilterStateToStorage,
  ServisFilterState,
} from '@/lib/servisler/filter-state';
import {
  hasServisFilterParams,
  serializeServisFilterStateToSearchParams,
} from '@/lib/servisler/filter-url';
import { ChevronLeft, ChevronRight, Clock3, FolderTree, Layers, MapPin, MessageCircleCode, PhoneCall } from 'lucide-react';

interface DataTableProps {
  columns: ColumnDef<ServiceGridRow, unknown>[];
  data: ServiceGridRow[];
  initialState: ServiceGridInitialState;
  serverPagination?: ServiceGridServerPagination;
}

type PersonelRol = 'SORUMLU' | 'DESTEK';

interface ServiceDetail {
  id: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
  personeller: Array<{
    personelId: string;
    rol: PersonelRol;
    personel: {
      ad: string;
      unvan: 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
    };
  }>;
}

interface ScoringServiceData {
  servisId: string;
  tekneAdi: string;
  isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
  servisAciklamasi: string;
  yer: string;
  personeller: Array<{
    personelId: string;
    personelAd: string;
    rol: PersonelRol;
    unvan: 'USTA' | 'CIRAK' | 'YONETICI' | 'OFIS';
  }>;
  zorlukSeviyesi?: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

interface CompletePayload {
  personeller: Array<{ personelId: string; rol: PersonelRol }>;
  bonusPersonelIds: string[];
  kaliteKontrol: {
    uniteModelVar: boolean;
    uniteSaatiVar: boolean;
    uniteSaatiExcludeFromScoring: boolean;
    uniteSeriNoVar: boolean;
    aciklamaYeterli: boolean;
    adamSaatVar: boolean;
    adamSaatExcludeFromScoring: boolean;
    // legacy aliases for backward compatibility
    uniteSaatiMuaf?: boolean;
    adamSaatMuaf?: boolean;
    fotograflarVar: boolean;
  };
  zorlukOverride: 'RUTIN' | 'ARIZA' | 'PROJE' | null;
}

type QueueCounts = Record<QueueFilter, number>;

type AdvancedFilters = {
  boatSearch: string;
  locations: string[];
  dateFrom: string;
  dateTo: string;
  technicians: string[];
  priorities: string[];
  blockingReasons: string[];
};

type PersonelOption = {
  id: string;
  ad: string;
  unvan: string;
};

type WorkOrderDictionariesResponse = {
  statuses?: Array<{
    key: string;
    label: string;
  }>;
  locations?: Array<{
    key: string;
    label: string;
  }>;
  blockingReasons?: Array<{
    key: string;
    label: string;
    durumKey?: string;
  }>;
};

const inArrayFilter: FilterFn<ServiceGridRow> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? filterValue.map(String) : [];
  if (!selected.length) return true;
  return selected.includes(String(row.getValue(columnId) ?? ''));
};

const ACTIVE_STATUS_SET = new Set<string>(ACTIVE_STATUS_VALUES);
const TERMINAL_STATUS_SET = new Set<string>(['TAMAMLANDI', 'IPTAL', 'ERTELENDI']);

function buildInitialColumnFilters(initialState: ServiceGridInitialState): ColumnFiltersState {
  const filters: ColumnFiltersState = [];

  if (initialState.search) filters.push({ id: 'tekneAdi', value: initialState.search });
  if (initialState.statuses.length > 0) filters.push({ id: 'durum', value: initialState.statuses });
  if (initialState.lokasyonGroups.length > 0) {
    filters.push({ id: 'yer', value: initialState.lokasyonGroups });
  }
  if (initialState.dateKeys.length > 0) filters.push({ id: 'tarihKey', value: initialState.dateKeys });

  return filters;
}

function buildInitialAdvancedFilters(initialState: ServiceGridInitialState): AdvancedFilters {
  return {
    boatSearch: initialState.search,
    locations: [...initialState.lokasyonGroups],
    dateFrom: initialState.dateFrom,
    dateTo: initialState.dateTo,
    technicians: [...initialState.technicians],
    priorities: [...initialState.priorities],
    blockingReasons: [...initialState.blockingReasons],
  };
}

function mergeFilterOptions<T extends { value: string; label: string }>(
  primary: T[],
  secondary: T[]
): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const option of [...primary, ...secondary]) {
    const value = option.value.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    merged.push({ ...option, value });
  }

  return merged;
}

function buildLocationOptionsFromRows(rows: ServiceGridRow[]): ServiceLocationOption[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.yer.trim())
        .filter(Boolean)
    )
  )
    .sort((left, right) => left.localeCompare(right, 'tr-TR'))
    .map((value) => ({ value, label: value }));
}

function buildStatusOptionsFromRows(rows: ServiceGridRow[]): ServiceStatusOption[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.durum.trim())
        .filter(Boolean)
    )
  )
    .sort((left, right) => left.localeCompare(right, 'tr-TR'))
    .map((value) => ({ value, label: getStatusConfig(value).label }));
}

function toggleFilterValue(values: string[], value: string, enabled: boolean): string[] {
  if (enabled) return Array.from(new Set([...values, value]));
  return values.filter((item) => item !== value);
}

function getStringFilterValue(columnFilters: ColumnFiltersState, filterId: string): string | undefined {
  const filter = columnFilters.find((item) => item.id === filterId);
  if (!filter) return undefined;
  if (typeof filter.value !== 'string') return undefined;
  const trimmed = filter.value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getArrayFilterValue(columnFilters: ColumnFiltersState, filterId: string): string[] | undefined {
  const filter = columnFilters.find((item) => item.id === filterId);
  if (!filter || !Array.isArray(filter.value)) return undefined;
  const values = filter.value.map((value) => String(value).trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function isDateAfterOrEqual(dateValue: string | null, threshold: string | null): boolean {
  if (!threshold) return true;
  const parsed = parseDateOnlyToUtcDate(dateValue);
  const thresholdDate = parseDateOnlyToUtcDate(threshold);
  if (!parsed || !thresholdDate) return false;
  return parsed.getTime() >= thresholdDate.getTime();
}

function isDateBeforeOrEqual(dateValue: string | null, threshold: string | null): boolean {
  if (!threshold) return true;
  const parsed = parseDateOnlyToUtcDate(dateValue);
  const thresholdDate = parseDateOnlyToUtcDate(threshold);
  if (!parsed || !thresholdDate) return false;
  return parsed.getTime() <= thresholdDate.getTime();
}

function matchesAny(value: string | null, selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (!value) return false;
  return selected.includes(value);
}

function getInitialGrouping(initialState: ServiceGridInitialState): GroupingState {
  if (initialState.groupBy === 'none') return [];
  return [initialState.groupBy];
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getTodayUtcNoon(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));
}

function addUtcDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function isSameUtcDay(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function getUtcWeekRange(base: Date): { start: Date; end: Date } {
  const dayOfWeek = base.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = addUtcDays(base, mondayOffset);
  const end = addUtcDays(start, 6);
  return { start, end };
}

function isOverdueRow(row: ServiceGridRow): boolean {
  const dueDate = row.tahminiBitisTarihi ?? row.tarih;
  return isDateBeforeTodayUtc(dueDate) && !TERMINAL_STATUS_SET.has(row.durum);
}

function applyQueueFilter(rows: ServiceGridRow[], queueFilter: QueueFilter): ServiceGridRow[] {
  switch (queueFilter) {
    case 'ACTIVE':
      return rows.filter((row) => ACTIVE_STATUS_SET.has(row.durum));
    case 'OVERDUE':
      return rows.filter(isOverdueRow);
    case 'UNASSIGNED':
      return rows.filter((row) => row.personelSayisi === 0);
    case 'UNSCHEDULED':
      return rows.filter((row) => !row.tarih);
    case 'WAITING':
      return rows.filter(
        (row) => row.durum === 'PARCA_BEKLIYOR' || row.durum === 'MUSTERI_ONAY_BEKLIYOR'
      );
    case 'ALL':
    default:
      return rows;
  }
}

function buildQueueCounts(rows: ServiceGridRow[]): QueueCounts {
  return {
    ALL: rows.length,
    ACTIVE: rows.filter((row) => ACTIVE_STATUS_SET.has(row.durum)).length,
    OVERDUE: rows.filter(isOverdueRow).length,
    UNASSIGNED: rows.filter((row) => row.personelSayisi === 0).length,
    UNSCHEDULED: rows.filter((row) => !row.tarih).length,
    WAITING: rows.filter(
      (row) => row.durum === 'PARCA_BEKLIYOR' || row.durum === 'MUSTERI_ONAY_BEKLIYOR'
    ).length,
  };
}

function applyDatePresetFilter(rows: ServiceGridRow[], preset: DatePreset): ServiceGridRow[] {
  if (preset === 'ALL') return rows;

  const today = getTodayUtcNoon();

  if (preset === 'BUGUN') {
    return rows.filter((row) => {
      const rowDate = parseDateOnlyToUtcDate(row.tarih);
      return rowDate ? isSameUtcDay(rowDate, today) : false;
    });
  }

  const targetDate = preset === 'YARIN' ? addUtcDays(today, 1) : null;
  const weekRange = preset === 'BU_HAFTA' ? getUtcWeekRange(today) : null;

  return rows.filter((row) => {
    const rowDate = parseDateOnlyToUtcDate(row.tarih);
    if (!rowDate) return false;

    if (targetDate) {
      return isSameUtcDay(rowDate, targetDate);
    }

    if (!weekRange) return true;

    return rowDate.getTime() >= weekRange.start.getTime() && rowDate.getTime() <= weekRange.end.getTime();
  });
}

function mapServiceToScoringData(service: ServiceDetail): ScoringServiceData {
  return {
    servisId: service.id,
    tekneAdi: service.tekneAdi,
    isTuru: service.isTuru,
    servisAciklamasi: service.servisAciklamasi,
    yer: service.yer,
    zorlukSeviyesi: service.zorlukSeviyesi ?? null,
    personeller: service.personeller.map((personel) => ({
      personelId: personel.personelId,
      personelAd: personel.personel.ad,
      rol: personel.rol,
      unvan: personel.personel.unvan,
    })),
  };
}

function buildWhatsappMessage(rows: ServiceGridRow[], title: string, subtitle: string): string {
  const header = [title, subtitle, `Toplam is: ${rows.length}`, ''];

  const lines = rows.map((row, index) => {
    const statusLabel = getStatusConfig(row.durum).label;
    const addressText = row.adres || '-';
    const contactText = row.irtibatKisi?.trim() ? row.irtibatKisi.trim() : 'Belirtilmedi';
    const phoneText = row.telefon?.trim() ? row.telefon.trim() : 'Belirtilmedi';
    const timeText = row.saat || '--:--';
    const jobText = row.servisAciklamasi?.trim() ? row.servisAciklamasi.trim() : '-';

    return [
      `${index + 1}) ${timeText} - ${row.tekneAdi}`,
      `Adres: ${addressText}`,
      `Durum: ${statusLabel}`,
      `Irtibat: ${contactText}`,
      `Telefon: ${phoneText}`,
      `Is: ${jobText}`,
      '',
    ].join('\n');
  });

  return [...header, ...lines].join('\n').trim();
}

export function DataTable({ columns, data, initialState, serverPagination }: DataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMountedRef = React.useRef(false);
  const storageHydratedRef = React.useRef(false);
  const syncReadyRef = React.useRef(false);
  const lastFilterQueryRef = React.useRef<string>('');
  const [rows, setRows] = React.useState<ServiceGridRow[]>(() => data);
  const [statusUpdatingIds, setStatusUpdatingIds] = React.useState<Set<string>>(() => new Set());
  const [datePreset, setDatePreset] = React.useState<DatePreset>('ALL');
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>(initialState.queueFilter);
  const [viewPreset, setViewPreset] = React.useState<ServiceViewPreset>('DEFAULT');
  const [advancedFilters, setAdvancedFilters] = React.useState<AdvancedFilters>(() =>
    buildInitialAdvancedFilters(initialState)
  );
  const [draftAdvancedFilters, setDraftAdvancedFilters] = React.useState<AdvancedFilters>(() =>
    buildInitialAdvancedFilters(initialState)
  );
  const [filterDrawerOpen, setFilterDrawerOpen] = React.useState(false);
  const [showScoring, setShowScoring] = React.useState(false);
  const [scoringService, setScoringService] = React.useState<ScoringServiceData | null>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [bulkStatus, setBulkStatus] = React.useState<string>('');
  const [bulkPersonelId, setBulkPersonelId] = React.useState<string>('');
  const [bulkPersonelRole, setBulkPersonelRole] = React.useState<PersonelRol>('SORUMLU');
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false);
  const [personelOptions, setPersonelOptions] = React.useState<PersonelOption[]>([]);
  const [personelLoading, setPersonelLoading] = React.useState(false);
  const [statusFilterOptions, setStatusFilterOptions] = React.useState<ServiceStatusOption[]>(
    () => STATUS_FILTER_OPTIONS
  );
  const [locationFilterOptions, setLocationFilterOptions] = React.useState<ServiceLocationOption[]>(() =>
    buildLocationOptionsFromRows(data)
  );
  const [blockingReasonOptions, setBlockingReasonOptions] = React.useState<string[]>([]);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tarih', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(() =>
    buildInitialColumnFilters(initialState)
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    tarihKey: false,
    lokasyonGroup: false,
    blokajNedeni: false,
  });
  const [grouping, setGrouping] = React.useState<GroupingState>(() => getInitialGrouping(initialState));
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: serverPagination?.limit ?? 25,
  });
  const [debouncedFilterState, setDebouncedFilterState] = React.useState<ServisFilterState>(() =>
    normalizeServisFilterState({
      tekneAdi: initialState.search,
      durum: initialState.statuses,
      konum: initialState.lokasyonGroups,
      tarih: initialState.dateKeys,
      dateFrom: initialState.dateFrom,
      dateTo: initialState.dateTo,
      teknisyen: initialState.technicians,
      oncelik: initialState.priorities,
      blokaj: initialState.blockingReasons,
      queue: initialState.queueFilter,
      groupBy: initialState.groupBy,
      datePreset: 'ALL',
    })
  );

  const setMultiFilterValue = React.useCallback((filterId: string, value: unknown) => {
    setColumnFilters((prev) => {
      const next = prev.filter((item) => item.id !== filterId);

      const shouldSet =
        value !== undefined &&
        value !== null &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'string' && value.trim() === '');

      if (shouldSet) {
        next.push({ id: filterId, value });
      }

      return next;
    });
  }, []);

  const applyPersistedFilterState = React.useCallback(
    (state: ServisFilterState) => {
      setMultiFilterValue('tekneAdi', state.tekneAdi ?? undefined);
      setMultiFilterValue('durum', state.durum && state.durum.length > 0 ? state.durum : undefined);
      setMultiFilterValue('yer', state.konum && state.konum.length > 0 ? state.konum : undefined);
      setMultiFilterValue('tarihKey', state.tarih && state.tarih.length > 0 ? state.tarih : undefined);
      const nextAdvanced: AdvancedFilters = {
        boatSearch: state.tekneAdi ?? '',
        locations: state.konum ?? [],
        dateFrom: state.dateFrom ?? '',
        dateTo: state.dateTo ?? '',
        technicians: state.teknisyen ?? [],
        priorities: state.oncelik ?? [],
        blockingReasons: state.blokaj ?? [],
      };
      setAdvancedFilters(nextAdvanced);
      setDraftAdvancedFilters(nextAdvanced);
      setQueueFilter(state.queue ?? 'ALL');
      setGrouping(state.groupBy && state.groupBy !== 'none' ? [state.groupBy] : []);
      setDatePreset(state.datePreset ?? 'ALL');
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    [setMultiFilterValue]
  );

  const applyViewPreset = React.useCallback(
    (preset: ServiceViewPreset) => {
      setViewPreset(preset);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setMultiFilterValue('tekneAdi', undefined);

      switch (preset) {
        case 'TODAY_TO_PLAN':
          setGrouping([]);
          setDatePreset('BUGUN');
          setQueueFilter('ALL');
          setMultiFilterValue('durum', ['RANDEVU_VERILDI']);
          setMultiFilterValue('yer', undefined);
          setMultiFilterValue('tarihKey', undefined);
          setAdvancedFilters({
            boatSearch: '',
            locations: [],
            dateFrom: '',
            dateTo: '',
            technicians: [],
            priorities: [],
            blockingReasons: [],
          });
          break;
        case 'BLOCKED':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('WAITING');
          setMultiFilterValue('durum', [
            'PARCA_BEKLIYOR',
            'MUSTERI_ONAY_BEKLIYOR',
            'RAPOR_BEKLIYOR',
            'ERTELENDI',
          ]);
          setMultiFilterValue('yer', undefined);
          setMultiFilterValue('tarihKey', undefined);
          setAdvancedFilters({
            boatSearch: '',
            locations: [],
            dateFrom: '',
            dateTo: '',
            technicians: [],
            priorities: ['YUKSEK'],
            blockingReasons: [],
          });
          break;
        case 'APPROVAL_PENDING':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('WAITING');
          setMultiFilterValue('durum', ['MUSTERI_ONAY_BEKLIYOR']);
          setMultiFilterValue('yer', undefined);
          setMultiFilterValue('tarihKey', undefined);
          setAdvancedFilters({
            boatSearch: '',
            locations: [],
            dateFrom: '',
            dateTo: '',
            technicians: [],
            priorities: [],
            blockingReasons: ['Onay Bekliyor'],
          });
          break;
        case 'PARTS_PENDING':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('WAITING');
          setMultiFilterValue('durum', ['PARCA_BEKLIYOR']);
          setMultiFilterValue('yer', undefined);
          setMultiFilterValue('tarihKey', undefined);
          setAdvancedFilters({
            boatSearch: '',
            locations: [],
            dateFrom: '',
            dateTo: '',
            technicians: [],
            priorities: [],
            blockingReasons: ['Parca Bekliyor'],
          });
          break;
        case 'DEFAULT':
        default:
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('ALL');
          setMultiFilterValue('durum', [...DEFAULT_STATUS_FILTERS]);
          setMultiFilterValue('yer', undefined);
          setMultiFilterValue('tarihKey', undefined);
          setAdvancedFilters({
            boatSearch: '',
            locations: [],
            dateFrom: '',
            dateTo: '',
            technicians: [],
            priorities: [],
            blockingReasons: [],
          });
          break;
      }
    },
    [setMultiFilterValue]
  );

  const handleSortingChange = React.useCallback(
    (updater: React.SetStateAction<SortingState>) => {
      if (!isMountedRef.current) return;
      setSorting(updater);
    },
    []
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: React.SetStateAction<ColumnFiltersState>) => {
      if (!isMountedRef.current) return;
      setColumnFilters(updater);
    },
    []
  );

  const handleColumnVisibilityChange = React.useCallback(
    (updater: React.SetStateAction<VisibilityState>) => {
      if (!isMountedRef.current) return;
      setColumnVisibility(updater);
    },
    []
  );

  const handleGroupingChange = React.useCallback(
    (updater: React.SetStateAction<GroupingState>) => {
      if (!isMountedRef.current) return;
      setGrouping(updater);
    },
    []
  );

  const handlePaginationChange = React.useCallback(
    (updater: React.SetStateAction<PaginationState>) => {
      if (!isMountedRef.current) return;
      setPagination(updater);
    },
    []
  );

  const handleRowSelectionChange = React.useCallback(
    (updater: React.SetStateAction<RowSelectionState>) => {
      if (!isMountedRef.current) return;
      setRowSelection(updater);
    },
    []
  );

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    if (storageHydratedRef.current) return;

    storageHydratedRef.current = true;
    if (hasServisFilterParams(searchParams)) return;

    const kayitliFiltre = loadServisFilterStateFromStorage();
    if (!kayitliFiltre) return;

    applyPersistedFilterState(kayitliFiltre);
  }, [applyPersistedFilterState, searchParams]);

  React.useEffect(() => {
    if (isMountedRef.current) {
      setRows(data);
    }
  }, [data]);

  React.useEffect(() => {
    if (!serverPagination) return;
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
      pageSize: serverPagination.limit,
    }));
  }, [serverPagination]);

  React.useEffect(() => {
    setStatusFilterOptions((prev) =>
      mergeFilterOptions(prev, buildStatusOptionsFromRows(rows))
    );
    setLocationFilterOptions((prev) =>
      mergeFilterOptions(prev, buildLocationOptionsFromRows(rows))
    );
  }, [rows]);

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    const validIds = new Set(rows.map((row) => row.id));
    setRowSelection((prev) => {
      const nextEntries = Object.entries(prev).filter(
        ([serviceId, isSelected]) => Boolean(isSelected) && validIds.has(serviceId)
      );
      const next = Object.fromEntries(nextEntries) as RowSelectionState;
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length) return prev;
      return next;
    });
  }, [rows]);

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    const hasSelection = Object.values(rowSelection).some(Boolean);
    if (!hasSelection) return;
    if (personelOptions.length > 0 || personelLoading) return;

    const controller = new AbortController();
    const loadPersonnel = async () => {
      setPersonelLoading(true);
      try {
        const response = await fetch('/api/personel?aktif=true', {
          signal: controller.signal,
          headers: getAuthHeaders(),
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error || 'Personel listesi alinamadi');
        }
        if (!controller.signal.aborted && Array.isArray(payload)) {
          const mapped = payload
            .map((item) => ({
              id: String((item as { id?: unknown }).id ?? '').trim(),
              ad: String((item as { ad?: unknown }).ad ?? '').trim(),
              unvan: String((item as { unvan?: unknown }).unvan ?? '').trim() || '-',
            }))
            .filter((item) => item.id && item.ad);
          setPersonelOptions(mapped);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const message =
            error instanceof Error ? error.message : 'Toplu atama icin personel listesi yuklenemedi.';
          toast.error(message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPersonelLoading(false);
        }
      }
    };

    void loadPersonnel();
    return () => {
      controller.abort();
    };
  }, [personelLoading, personelOptions.length, rowSelection]);

  React.useEffect(() => {
    const controller = new AbortController();

    const loadDictionaries = async () => {
      try {
        const response = await fetch('/api/dictionaries/work-order', {
          signal: controller.signal,
          headers: getAuthHeaders(),
          cache: 'no-store',
        });

        const payload = (await response.json().catch(() => null)) as
          | WorkOrderDictionariesResponse
          | null;
        if (!response.ok) {
          throw new Error(
            (payload as { error?: string } | null)?.error || 'Sozluk verileri yuklenemedi'
          );
        }

        if (controller.signal.aborted) return;

        const statusOptionsFromDictionary = (payload?.statuses ?? [])
          .map((item) => ({
            value: String(item.key ?? '').trim(),
            label: String(item.label ?? item.key ?? '').trim(),
          }))
          .filter((item) => item.value.length > 0);

        const locationOptionsFromDictionary = (payload?.locations ?? [])
          .map((item) => ({
            value: String(item.key ?? '').trim(),
            label: String(item.label ?? item.key ?? '').trim(),
          }))
          .filter((item) => item.value.length > 0);

        const blockingLabels = (payload?.blockingReasons ?? [])
          .map((item) => String(item.label ?? '').trim())
          .filter(Boolean);

        setStatusFilterOptions((prev) =>
          mergeFilterOptions(
            statusOptionsFromDictionary.length > 0 ? statusOptionsFromDictionary : prev,
            buildStatusOptionsFromRows(data)
          )
        );
        setLocationFilterOptions((prev) =>
          mergeFilterOptions(
            locationOptionsFromDictionary.length > 0 ? locationOptionsFromDictionary : prev,
            buildLocationOptionsFromRows(data)
          )
        );
        setBlockingReasonOptions(blockingLabels);
      } catch (error) {
        if (!controller.signal.aborted) {
          const message = error instanceof Error ? error.message : 'Sozluk verileri yuklenemedi.';
          toast.error(message);
        }
      }
    };

    void loadDictionaries();
    return () => {
      controller.abort();
    };
  }, [data]);

  React.useEffect(() => {
    if (!filterDrawerOpen) {
      setDraftAdvancedFilters({
        ...advancedFilters,
        boatSearch: getStringFilterValue(columnFilters, 'tekneAdi') ?? '',
        locations: getArrayFilterValue(columnFilters, 'yer') ?? [],
      });
    }
  }, [advancedFilters, columnFilters, filterDrawerOpen]);

  const aktifFiltreDurumu = React.useMemo<ServisFilterState>(
    () =>
      normalizeServisFilterState({
        tekneAdi: getStringFilterValue(columnFilters, 'tekneAdi'),
        durum: getArrayFilterValue(columnFilters, 'durum'),
        konum: getArrayFilterValue(columnFilters, 'yer'),
        tarih: getArrayFilterValue(columnFilters, 'tarihKey'),
        dateFrom: advancedFilters.dateFrom || undefined,
        dateTo: advancedFilters.dateTo || undefined,
        teknisyen: advancedFilters.technicians,
        oncelik: advancedFilters.priorities,
        blokaj: advancedFilters.blockingReasons,
        queue: queueFilter,
        groupBy:
          grouping[0] === 'tekneAdi' || grouping[0] === 'lokasyonGroup' ? grouping[0] : 'none',
        datePreset,
      }),
    [advancedFilters, columnFilters, datePreset, grouping, queueFilter]
  );

  React.useEffect(() => {
    if (!isMountedRef.current) return;

    const waitMs = aktifFiltreDurumu.tekneAdi ? 350 : 0;
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilterState(aktifFiltreDurumu);
    }, waitMs);

    return () => window.clearTimeout(timeoutId);
  }, [aktifFiltreDurumu]);

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    if (!syncReadyRef.current) {
      lastFilterQueryRef.current = serializeServisFilterStateToSearchParams(debouncedFilterState).toString();
      syncReadyRef.current = true;
      return;
    }

    const filterParams = serializeServisFilterStateToSearchParams(debouncedFilterState);
    const filterQuery = filterParams.toString();
    const isFilterChanged = lastFilterQueryRef.current !== filterQuery;
    lastFilterQueryRef.current = filterQuery;

    saveServisFilterStateToStorage(debouncedFilterState);

    const params = new URLSearchParams(filterQuery);
    if (serverPagination?.limit) {
      params.set('limit', String(serverPagination.limit));
    }
    if (!isFilterChanged) {
      const currentPage = searchParams.get('page');
      const parsedPage = currentPage ? Number.parseInt(currentPage, 10) : NaN;
      if (Number.isFinite(parsedPage) && parsedPage > 1) {
        params.set('page', String(parsedPage));
      }
    }

    const query = params.toString();
    const hedefUrl = query ? `${pathname}?${query}` : pathname;
    const mevcutQuery = searchParams.toString();
    const mevcutUrl = mevcutQuery ? `${pathname}?${mevcutQuery}` : pathname;

    if (hedefUrl !== mevcutUrl) {
      router.replace(hedefUrl, { scroll: false });
    }
  }, [debouncedFilterState, pathname, router, searchParams, serverPagination?.limit]);

  const advancedFilteredRows = React.useMemo(
    () =>
      rows.filter((row) => {
        const rowDate = row.tarih ?? null;
        const inDateRange =
          isDateAfterOrEqual(rowDate, advancedFilters.dateFrom || null) &&
          isDateBeforeOrEqual(rowDate, advancedFilters.dateTo || null);
        const technicianMatch =
          advancedFilters.technicians.length === 0
            ? true
            : row.atananTeknisyenler.some((name) => advancedFilters.technicians.includes(name));
        const priorityMatch = matchesAny(row.oncelik, advancedFilters.priorities);
        const blockingMatch = matchesAny(row.blokajNedeni, advancedFilters.blockingReasons);
        return inDateRange && technicianMatch && priorityMatch && blockingMatch;
      }),
    [advancedFilters, rows]
  );

  const queueCounts = React.useMemo(() => buildQueueCounts(advancedFilteredRows), [advancedFilteredRows]);
  const queueFilteredRows = React.useMemo(
    () => applyQueueFilter(advancedFilteredRows, queueFilter),
    [advancedFilteredRows, queueFilter]
  );
  const presetFilteredRows = React.useMemo(
    () => applyDatePresetFilter(queueFilteredRows, datePreset),
    [datePreset, queueFilteredRows]
  );

  const availableTechnicians = React.useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((row) => row.atananTeknisyenler).map((name) => name.trim()).filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, 'tr-TR')),
    [rows]
  );

  const availableBlockingReasons = React.useMemo(
    () =>
      Array.from(
        new Set(
          [...blockingReasonOptions, ...rows.map((row) => row.blokajNedeni?.trim() ?? '')]
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right, 'tr-TR')),
    [blockingReasonOptions, rows]
  );

  const onServiceDeleted = React.useCallback((serviceId: string) => {
    if (!isMountedRef.current) return;
    setRows((prev) => prev.filter((item) => item.id !== serviceId));
  }, []);

  const isServiceStatusUpdating = React.useCallback(
    (serviceId: string) => statusUpdatingIds.has(serviceId),
    [statusUpdatingIds]
  );

  const fetchServiceDetail = React.useCallback(async (serviceId: string): Promise<ServiceDetail> => {
    const authHeaders = getAuthHeaders();
    let response = await fetch(`/api/services/${serviceId}`, {
      headers: authHeaders,
    });

    if (response.status === 401 && authHeaders.Authorization) {
      response = await fetch(`/api/services/${serviceId}`);
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || 'Servis detayları alınamadı');
    }

    return payload as ServiceDetail;
  }, []);

  const handleScoringSave = React.useCallback(
    async (servisId: string, payload: CompletePayload) => {
      const authHeaders = getAuthHeaders();
      let response = await fetch(`/api/services/${servisId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 && authHeaders.Authorization) {
        response = await fetch(`/api/services/${servisId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || 'Puanlama kaydedilemedi');
      }

      if (!isMountedRef.current) return;
      const completedDate = new Date().toISOString().slice(0, 10);
      setRows((prev) =>
        prev.map((item) =>
          item.id === servisId
            ? {
                ...item,
                durum: 'TAMAMLANDI',
                tarih: completedDate,
                tahminiBitisTarihi: completedDate,
              }
            : item
        )
      );
      setShowScoring(false);
      setScoringService(null);
      toast.success('Puanlama kaydedildi, servis tamamlandı.', {
        action: {
          label: 'Sablon olustur',
          onClick: () => router.push(`/raporlar/whatsapp?serviceId=${servisId}`),
        },
      });
      router.refresh();
    },
    [router]
  );

  const openScoringModalForCompletion = React.useCallback(
    async (serviceId: string) => {
      const detail = await fetchServiceDetail(serviceId);
      if (!isMountedRef.current) return;
      setScoringService(mapServiceToScoringData(detail));
      setShowScoring(true);
      toast.info('Tamamlandı durumuna geçmek için puanlama gerekli.');
    },
    [fetchServiceDetail]
  );

  const onServiceStatusChange = React.useCallback(
    async (serviceId: string, nextStatus: string) => {
      const current = rows.find((item) => item.id === serviceId);
      if (!current || current.durum === nextStatus) return;
      const normalizedNextStatus = normalizeServisDurumuForDb(nextStatus);

      if (normalizedNextStatus === 'TAMAMLANDI' && current.durum !== 'TAMAMLANDI') {
        try {
          await openScoringModalForCompletion(serviceId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Puanlama ekranı açılamadı';
          toast.error(message);
        }
        return;
      }

      const previousStatus = current.durum;

      setRows((prev) =>
        prev.map((item) => (item.id === serviceId ? { ...item, durum: normalizedNextStatus } : item))
      );
      setStatusUpdatingIds((prev) => {
        const next = new Set(prev);
        next.add(serviceId);
        return next;
      });

      try {
        const authHeaders = getAuthHeaders();
        let response = await fetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            durum: normalizedNextStatus,
          }),
        });

        if (response.status === 401 && authHeaders.Authorization) {
          response = await fetch(`/api/services/${serviceId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              durum: normalizedNextStatus,
            }),
          });
        }

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || 'Durum güncellenemedi');
        }

        toast.success('Servis durumu güncellendi');
        router.refresh();
      } catch (error) {
        if (isMountedRef.current) {
          setRows((prev) =>
            prev.map((item) => (item.id === serviceId ? { ...item, durum: previousStatus } : item))
          );
        }
        const message = error instanceof Error ? error.message : 'Durum güncellemesi başarısız';
        toast.error(message);
      } finally {
        if (isMountedRef.current) {
          setStatusUpdatingIds((prev) => {
            const next = new Set(prev);
            next.delete(serviceId);
            return next;
          });
        }
      }
    },
    [openScoringModalForCompletion, router, rows]
  );

  const handleCopyRowWhatsapp = React.useCallback(async (service: ServiceGridRow) => {
    const dateText = service.tarih ? formatDateDdmmyyyShortMonth(service.tarih) : 'Tarihsiz';
    const statusLabel = getStatusConfig(service.durum).label;
    const lineMessage = [
      'TEKNIK EKIP - HIZLI SATIR',
      `Tarih: ${dateText}`,
      '',
      `${service.saat || '--:--'} | ${service.tekneAdi}`,
      `Adres: ${service.adres || '-'}`,
      `Servis: ${service.servisAciklamasi || '-'}`,
      `Durum: ${statusLabel}`,
      `Irtibat: ${service.irtibatKisi?.trim() || 'Belirtilmedi'}`,
      `Telefon: ${service.telefon?.trim() || 'Belirtilmedi'}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lineMessage);
      toast.success('Servis satiri WhatsApp formatiyla kopyalandi.');
    } catch {
      toast.error('Satir metni panoya kopyalanamadi.');
    }
  }, []);

  const selectedServiceIds = React.useMemo(
    () => Object.entries(rowSelection).filter(([, isSelected]) => Boolean(isSelected)).map(([serviceId]) => serviceId),
    [rowSelection]
  );
  const selectedServiceCount = selectedServiceIds.length;

  const bulkStatusOptions = React.useMemo(
    () => statusFilterOptions.filter((status) => status.value !== 'TAMAMLANDI'),
    [statusFilterOptions]
  );

  const clearSelectedRows = React.useCallback(() => {
    setRowSelection({});
    setBulkStatus('');
    setBulkPersonelId('');
    setBulkPersonelRole('SORUMLU');
  }, []);

  const runPatchRequest = React.useCallback(async (serviceId: string, payload: Record<string, unknown>) => {
    const authHeaders = getAuthHeaders();
    let response = await fetch(`/api/services/${serviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 && authHeaders.Authorization) {
      response = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((responseBody as { error?: string } | null)?.error || 'Toplu islem basarisiz');
    }
  }, []);

  const handleBulkStatusApply = React.useCallback(async () => {
    if (!bulkStatus) {
      toast.error('Toplu durum guncellemesi icin yeni durum secin.');
      return;
    }
    if (selectedServiceIds.length === 0) return;

    const nextStatus = normalizeServisDurumuForDb(bulkStatus);
    if (nextStatus === 'TAMAMLANDI') {
      toast.error('Tamamlandi gecisi toplu degil, puanlama akisindan yapilmalidir.');
      return;
    }

    setBulkActionLoading(true);
    const successIds: string[] = [];
    let firstError: string | null = null;

    for (const serviceId of selectedServiceIds) {
      try {
        await runPatchRequest(serviceId, { durum: nextStatus });
        successIds.push(serviceId);
      } catch (error) {
        if (!firstError) {
          firstError = error instanceof Error ? error.message : 'Durum guncellenemedi';
        }
      }
    }

    if (successIds.length > 0) {
      const successSet = new Set(successIds);
      setRows((prev) =>
        prev.map((item) => (successSet.has(item.id) ? { ...item, durum: nextStatus } : item))
      );
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of successIds) {
          delete next[id];
        }
        return next;
      });
      router.refresh();
    }

    if (successIds.length === selectedServiceIds.length) {
      toast.success(`${successIds.length} is emrinin durumu guncellendi.`);
    } else {
      const failedCount = selectedServiceIds.length - successIds.length;
      toast.error(
        `${successIds.length} basarili, ${failedCount} basarisiz. ${firstError ? `Detay: ${firstError}` : ''}`.trim()
      );
    }

    setBulkActionLoading(false);
  }, [bulkStatus, router, runPatchRequest, selectedServiceIds]);

  const handleBulkAssign = React.useCallback(async () => {
    if (!bulkPersonelId) {
      toast.error('Toplu atama icin teknisyen secin.');
      return;
    }
    if (selectedServiceIds.length === 0) return;

    const selectedTechnician = personelOptions.find((item) => item.id === bulkPersonelId);
    if (!selectedTechnician) {
      toast.error('Secilen teknisyen bulunamadi.');
      return;
    }

    setBulkActionLoading(true);
    const successIds: string[] = [];
    let firstError: string | null = null;

    for (const serviceId of selectedServiceIds) {
      try {
        const detail = await fetchServiceDetail(serviceId);
        const nextAssignments = detail.personeller
          .filter((assignment) => assignment.personelId !== bulkPersonelId)
          .map((assignment) => ({
            personelId: assignment.personelId,
            rol: assignment.rol,
          }));
        nextAssignments.push({ personelId: bulkPersonelId, rol: bulkPersonelRole });

        await runPatchRequest(serviceId, {
          personeller: nextAssignments,
        });
        successIds.push(serviceId);
      } catch (error) {
        if (!firstError) {
          firstError = error instanceof Error ? error.message : 'Toplu atama basarisiz';
        }
      }
    }

    if (successIds.length > 0) {
      const successSet = new Set(successIds);
      setRows((prev) =>
        prev.map((item) => {
          if (!successSet.has(item.id)) return item;
          const nextTechnicians = item.atananTeknisyenler.includes(selectedTechnician.ad)
            ? item.atananTeknisyenler
            : [...item.atananTeknisyenler, selectedTechnician.ad];
          return {
            ...item,
            atananTeknisyenler: nextTechnicians,
            personelSayisi: Math.max(item.personelSayisi, nextTechnicians.length),
          };
        })
      );
      setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of successIds) {
          delete next[id];
        }
        return next;
      });
      router.refresh();
    }

    if (successIds.length === selectedServiceIds.length) {
      toast.success(`${successIds.length} is emrine teknisyen atandi.`);
    } else {
      const failedCount = selectedServiceIds.length - successIds.length;
      toast.error(
        `${successIds.length} basarili, ${failedCount} basarisiz. ${firstError ? `Detay: ${firstError}` : ''}`.trim()
      );
    }

    setBulkActionLoading(false);
  }, [
    bulkPersonelId,
    bulkPersonelRole,
    fetchServiceDetail,
    personelOptions,
    router,
    runPatchRequest,
    selectedServiceIds,
  ]);

  const tableMeta = React.useMemo<ServiceTableMeta>(
    () => ({
      onServiceStatusChange,
      isServiceStatusUpdating,
      onServiceDeleted,
      onCopyRowWhatsapp: handleCopyRowWhatsapp,
      statusOptions: statusFilterOptions,
      locationOptions: locationFilterOptions,
    }),
    [
      onServiceDeleted,
      onServiceStatusChange,
      isServiceStatusUpdating,
      handleCopyRowWhatsapp,
      statusFilterOptions,
      locationFilterOptions,
    ]
  );

  const columnsWithSelection = React.useMemo<ColumnDef<ServiceGridRow, unknown>[]>(
    () => [
      {
        id: '__selection__',
        size: 44,
        enableHiding: false,
        enableSorting: false,
        header: ({ table }) => (
          <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <Checkbox
              aria-label="Tum satirlari sec"
              data-testid="bulk-select-all-checkbox"
              checked={
                table.getIsAllPageRowsSelected()
                  ? true
                  : table.getIsSomePageRowsSelected()
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <Checkbox
              aria-label={`Satiri sec ${row.original.tekneAdi}`}
              data-testid={`bulk-select-row-${row.original.id}`}
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            />
          </div>
        ),
      },
      ...columns,
    ],
    [columns]
  );

  const table = useReactTable({
    data: presetFilteredRows,
    columns: columnsWithSelection,
    meta: tableMeta,
    filterFns: {
      inArray: inArrayFilter,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      grouping,
      pagination,
      rowSelection,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onGroupingChange: handleGroupingChange,
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sortedRows = table
    .getSortedRowModel()
    .rows.filter((row) => !row.getIsGrouped())
    .map((row) => row.original);
  const mobileDataRows = table.getRowModel().rows.filter((row) => !row.getIsGrouped());
  const mobileRows = mobileDataRows.map((row) => row.original);

  const tomorrowDateLabel = React.useMemo(() => {
    const tomorrow = addUtcDays(getTodayUtcNoon(), 1).toISOString().slice(0, 10);
    return formatDateDdmmyyyShortMonth(tomorrow);
  }, []);

  const handleExportWhatsapp = React.useCallback(async (preset: DatePreset) => {
    const allowedStatuses = new Set(['RANDEVU_VERILDI', 'DEVAM_EDIYOR']);
    const scopedRows = applyDatePresetFilter(rows, preset).filter((row) => allowedStatuses.has(row.durum));
    if (scopedRows.length === 0) {
      toast.error('Secilen kapsamda paylasilacak teknik ekip servisi bulunamadi.');
      return;
    }

    const today = getTodayUtcNoon();
    const weekRange = getUtcWeekRange(today);
    const title =
      preset === 'BUGUN' ? 'BUGUN TEKNIK EKIP SERVIS PLANI' :
      preset === 'YARIN' ? 'YARIN TEKNIK EKIP SERVIS PLANI' :
      'BU HAFTA TEKNIK EKIP SERVIS PLANI';
    const subtitle =
      preset === 'BUGUN'
        ? `Tarih: ${formatDateDdmmyyyShortMonth(today.toISOString().slice(0, 10))}`
        : preset === 'YARIN'
          ? `Tarih: ${formatDateDdmmyyyShortMonth(addUtcDays(today, 1).toISOString().slice(0, 10))}`
          : `Aralik: ${formatDateDdmmyyyShortMonth(weekRange.start.toISOString().slice(0, 10))} - ${formatDateDdmmyyyShortMonth(weekRange.end.toISOString().slice(0, 10))}`;

    const message = buildWhatsappMessage(scopedRows, title, subtitle);

    try {
      await navigator.clipboard.writeText(message);
      toast.success('Teknik ekip WhatsApp metni panoya kopyalandi.');
    } catch {
      toast.error('Mesaj panoya kopyalanamadi.');
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [rows]);

  const applyAdvancedFilters = React.useCallback(() => {
    setMultiFilterValue('tekneAdi', draftAdvancedFilters.boatSearch || undefined);
    setMultiFilterValue(
      'yer',
      draftAdvancedFilters.locations.length > 0 ? draftAdvancedFilters.locations : undefined
    );
    setAdvancedFilters({
      boatSearch: draftAdvancedFilters.boatSearch,
      locations: [...draftAdvancedFilters.locations],
      dateFrom: draftAdvancedFilters.dateFrom,
      dateTo: draftAdvancedFilters.dateTo,
      technicians: [...draftAdvancedFilters.technicians],
      priorities: [...draftAdvancedFilters.priorities],
      blockingReasons: [...draftAdvancedFilters.blockingReasons],
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setFilterDrawerOpen(false);
  }, [draftAdvancedFilters, setMultiFilterValue]);

  const clearAdvancedFilters = React.useCallback(() => {
    const cleared: AdvancedFilters = {
      boatSearch: '',
      locations: [],
      dateFrom: '',
      dateTo: '',
      technicians: [],
      priorities: [],
      blockingReasons: [],
    };
    setMultiFilterValue('tekneAdi', undefined);
    setMultiFilterValue('yer', undefined);
    setDraftAdvancedFilters(cleared);
    setAdvancedFilters(cleared);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [setMultiFilterValue]);

  const updateServerPagination = React.useCallback(
    (nextPage: number, nextLimit?: number) => {
      if (!serverPagination) return;

      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(Math.max(1, nextPage)));
      params.set('limit', String(nextLimit ?? serverPagination.limit));

      const query = params.toString();
      const targetUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router, searchParams, serverPagination]
  );

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-20 space-y-3 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-bg)]/90 p-3 backdrop-blur">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <DatePresetFilter
            value={datePreset}
            onChange={(next) => {
              setDatePreset(next);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full lg:w-auto"
            onClick={() => void handleExportWhatsapp('YARIN')}
            disabled={sortedRows.length === 0}
          >
            <MessageCircleCode className="mr-2 h-4 w-4" />
            Yarinin planini WhatsAppa aktar ({tomorrowDateLabel})
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full lg:w-auto"
            onClick={() => void handleExportWhatsapp('BUGUN')}
            disabled={sortedRows.length === 0}
          >
            <MessageCircleCode className="mr-2 h-4 w-4" />
            Bugunun planini WhatsAppa aktar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full lg:w-auto"
            onClick={() => void handleExportWhatsapp('BU_HAFTA')}
            disabled={sortedRows.length === 0}
          >
            <MessageCircleCode className="mr-2 h-4 w-4" />
            Bu haftayi WhatsAppa aktar
          </Button>
        </div>

        <DataTableToolbar
          table={table}
          queueFilter={queueFilter}
          onQueueFilterChange={(next) => {
            setQueueFilter(next);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          queueCounts={queueCounts}
          viewPreset={viewPreset}
          onViewPresetChange={applyViewPreset}
          onOpenFilterDrawer={() => {
            setDraftAdvancedFilters({
              ...advancedFilters,
              boatSearch: getStringFilterValue(columnFilters, 'tekneAdi') ?? '',
              locations: getArrayFilterValue(columnFilters, 'yer') ?? [],
            });
            setFilterDrawerOpen(true);
          }}
          statusFilterOptions={statusFilterOptions}
          locationFilterOptions={locationFilterOptions}
          isDatePresetActive={datePreset !== 'ALL'}
          onClearDatePreset={() => setDatePreset('ALL')}
        />

        <SavedFilters
          aktifFiltreDurumu={aktifFiltreDurumu}
          onFiltreYukle={applyPersistedFilterState}
        />

        {selectedServiceCount > 0 ? (
          <div
            data-testid="bulk-actions-bar"
            className="rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/70 p-3"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <span className="chip">{selectedServiceCount} is secildi</span>

              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="h-10 w-full min-w-[180px] sm:w-[220px]" data-testid="bulk-status-select">
                    <SelectValue placeholder="Yeni durum secin" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    {bulkStatusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="h-10"
                  onClick={() => void handleBulkStatusApply()}
                  disabled={!bulkStatus || bulkActionLoading}
                  data-testid="bulk-status-apply"
                >
                  Toplu Durum Guncelle
                </Button>

                <Select value={bulkPersonelId} onValueChange={setBulkPersonelId}>
                  <SelectTrigger className="h-10 w-full min-w-[200px] sm:w-[240px]" data-testid="bulk-personel-select">
                    <SelectValue placeholder={personelLoading ? 'Teknisyen yukleniyor...' : 'Teknisyen secin'} />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    {personelOptions.map((personel) => (
                      <SelectItem key={personel.id} value={personel.id}>
                        {personel.ad} ({personel.unvan})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={bulkPersonelRole} onValueChange={(value) => setBulkPersonelRole(value as PersonelRol)}>
                  <SelectTrigger className="h-10 w-full min-w-[150px] sm:w-[170px]" data-testid="bulk-personel-role-select">
                    <SelectValue placeholder="Rol secin" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    <SelectItem value="SORUMLU">Sorumlu</SelectItem>
                    <SelectItem value="DESTEK">Destek</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="h-10"
                  onClick={() => void handleBulkAssign()}
                  disabled={!bulkPersonelId || bulkActionLoading}
                  data-testid="bulk-assign-apply"
                >
                  Toplu Teknisyen Ata
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={clearSelectedRows}
                disabled={bulkActionLoading}
                data-testid="bulk-clear-selection"
              >
                Secimi Temizle
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Gelismis Filtreler</SheetTitle>
            <SheetDescription>
              Tekne, lokasyon, tarih araligi, teknisyen, oncelik ve blokaj nedenine gore filtre uygulayin.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <section className="space-y-2">
              <Label className="text-sm font-medium">Tekne</Label>
              <Input
                value={draftAdvancedFilters.boatSearch}
                placeholder="Tekne adi ile ara..."
                onChange={(event) =>
                  setDraftAdvancedFilters((prev) => ({
                    ...prev,
                    boatSearch: event.target.value,
                  }))
                }
              />
            </section>

            <section className="space-y-2">
              <Label className="text-sm font-medium">Lokasyon</Label>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                {locationFilterOptions.map((option) => {
                  const checked = draftAdvancedFilters.locations.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setDraftAdvancedFilters((prev) => ({
                            ...prev,
                            locations: toggleFilterValue(prev.locations, option.value, Boolean(value)),
                          }))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-sm font-medium">Tarih Araligi</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Baslangic</Label>
                  <Input
                    type="date"
                    value={draftAdvancedFilters.dateFrom}
                    onChange={(event) =>
                      setDraftAdvancedFilters((prev) => ({
                        ...prev,
                        dateFrom: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bitis</Label>
                  <Input
                    type="date"
                    value={draftAdvancedFilters.dateTo}
                    onChange={(event) =>
                      setDraftAdvancedFilters((prev) => ({
                        ...prev,
                        dateTo: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-sm font-medium">Teknisyen</Label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border/70 p-3">
                {availableTechnicians.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Atanmis teknisyen kaydi bulunamadi.</p>
                ) : (
                  availableTechnicians.map((name) => {
                    const checked = draftAdvancedFilters.technicians.includes(name);
                    return (
                      <label key={name} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setDraftAdvancedFilters((prev) => ({
                              ...prev,
                              technicians: toggleFilterValue(prev.technicians, name, Boolean(value)),
                            }))
                          }
                        />
                        <span>{name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-sm font-medium">Oncelik</Label>
              <div className="space-y-2 rounded-md border border-border/70 p-3">
                {PRIORITY_FILTER_OPTIONS.map((option) => {
                  const checked = draftAdvancedFilters.priorities.includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setDraftAdvancedFilters((prev) => ({
                            ...prev,
                            priorities: toggleFilterValue(prev.priorities, option.value, Boolean(value)),
                          }))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <Label className="text-sm font-medium">Blokaj Nedeni</Label>
              <div className="max-h-40 space-y-2 overflow-auto rounded-md border border-border/70 p-3">
                {availableBlockingReasons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Blokaj nedeni kaydi bulunamadi.</p>
                ) : (
                  availableBlockingReasons.map((reason) => {
                    const checked = draftAdvancedFilters.blockingReasons.includes(reason);
                    return (
                      <label key={reason} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            setDraftAdvancedFilters((prev) => ({
                              ...prev,
                              blockingReasons: toggleFilterValue(
                                prev.blockingReasons,
                                reason,
                                Boolean(value)
                              ),
                            }))
                          }
                        />
                        <span>{reason}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={clearAdvancedFilters}>
              Temizle
            </Button>
            <Button type="button" onClick={applyAdvancedFilters}>
              Uygula
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="space-y-3 lg:hidden">
        {mobileRows.length > 0 ? (
          mobileDataRows.map((tableRow) => {
            const service = tableRow.original;
            return (
            <div
              key={service.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Checkbox
                  aria-label={`Satiri sec ${service.tekneAdi}`}
                  checked={tableRow.getIsSelected()}
                  onCheckedChange={(value) => tableRow.toggleSelected(Boolean(value))}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1"
                />
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => router.push(`/servisler/${service.id}`)}
                >
                  <p className="text-sm font-semibold">{service.tekneAdi}</p>
                  <p className="text-xs text-muted-foreground">{service.servisAciklamasi}</p>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 shrink-0"
                  onClick={() => void handleCopyRowWhatsapp(service)}
                >
                  <MessageCircleCode className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5" />
                  {service.tarih ? formatDateDdmmyyyShortMonth(service.tarih) : 'Tarihsiz'} {service.saat || '--:--'}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {service.adres || '-'}
                </p>
                <p className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5" />
                  {service.telefon || 'Belirtilmedi'}
                </p>
                <p className="text-[11px]">
                  Durum: <span className="font-medium text-foreground">{getStatusConfig(service.durum).label}</span>
                </p>
              </div>
            </div>
          );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/30 p-5 text-center text-sm text-muted-foreground">
            Filtrelere uygun kayıt bulunamadı.
          </div>
        )}
      </div>

      <div className="hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60 lg:block">
        <Table data-testid="servis-list-table">
          <TableHeader className="sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="sticky top-0 bg-[var(--color-bg)]/95">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody data-testid="servis-table-body">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  data-testid={`servis-row-${row.original.id}`}
                  className="cursor-pointer"
                  onClick={() => {
                    if (!row.getIsGrouped() && row.original.id) {
                      router.push(`/servisler/${row.original.id}`);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.getIsGrouped() ? (
                        <button
                          type="button"
                          onClick={row.getToggleExpandedHandler()}
                          className="inline-flex items-center gap-2 text-sm font-medium"
                        >
                          <FolderTree className="h-4 w-4 text-muted-foreground" />
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          <span className="text-xs text-muted-foreground">({row.subRows.length})</span>
                        </button>
                      ) : cell.getIsAggregated() ? (
                        flexRender(
                          cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      ) : cell.getIsPlaceholder() ? null : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsWithSelection.length} className="h-28 text-center text-muted-foreground">
                  Filtrelere uygun kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {serverPagination ? (
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)]/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>
              Sayfa {serverPagination.page} / {serverPagination.totalPages} • Toplam {serverPagination.total} kayıt
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={String(serverPagination.limit)}
              onValueChange={(value) => updateServerPagination(1, Number(value))}
            >
              <SelectTrigger className="h-11 w-[130px]">
                <SelectValue placeholder="Sayfa Boyutu" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / sayfa
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-4"
              onClick={() => updateServerPagination(serverPagination.page - 1)}
              disabled={serverPagination.page <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Önceki
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-4"
              onClick={() => updateServerPagination(serverPagination.page + 1)}
              disabled={serverPagination.page >= serverPagination.totalPages}
            >
              Sonraki <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-[var(--color-border)]/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <span>
              Sayfa {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="h-11 w-[130px]">
                <SelectValue placeholder="Sayfa Boyutu" />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground">
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / sayfa
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-4"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Önceki
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-4"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Sonraki <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ServisKapanisModal
        acik={showScoring}
        onKapat={() => {
          setShowScoring(false);
          setScoringService(null);
        }}
        servis={scoringService}
        onPuanlamaKaydet={handleScoringSave}
      />
    </div>
  );
}
