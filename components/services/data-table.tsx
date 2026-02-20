'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  GroupingState,
  PaginationState,
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
import { DatePreset, DatePresetFilter } from '@/components/table/date-preset-filter';
import { SavedFilters } from '@/components/servisler/SavedFilters';
import { DataTableToolbar, ToolbarSortOption } from './data-table-toolbar';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import {
  ACTIVE_STATUS_VALUES,
  DataGridGroupBy,
  DEFAULT_STATUS_FILTERS,
  QueueFilter,
  ServiceGridInitialState,
  ServiceGridRow,
  ServiceTableMeta,
  ServiceViewPreset,
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
  buildServisUrlFromFilterState,
  hasServisFilterParams,
} from '@/lib/servisler/filter-url';
import { ChevronLeft, ChevronRight, Clock3, FolderTree, Layers, MapPin, MessageCircleCode, PhoneCall } from 'lucide-react';

interface DataTableProps {
  columns: ColumnDef<ServiceGridRow, unknown>[];
  data: ServiceGridRow[];
  initialState: ServiceGridInitialState;
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
    filters.push({ id: 'lokasyonGroup', value: initialState.lokasyonGroups });
  }
  if (initialState.dateKeys.length > 0) filters.push({ id: 'tarihKey', value: initialState.dateKeys });

  return filters;
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

function getSortOptionFromSorting(sorting: SortingState): ToolbarSortOption {
  const firstSort = sorting[0];
  if (!firstSort) return 'DATE_DESC';

  if (firstSort.id === 'tarih') return firstSort.desc ? 'DATE_DESC' : 'DATE_ASC';
  if (firstSort.id === 'saat') return firstSort.desc ? 'TIME_DESC' : 'TIME_ASC';
  if (firstSort.id === 'tekneAdi') return firstSort.desc ? 'BOAT_DESC' : 'BOAT_ASC';
  if (firstSort.id === 'adres') return firstSort.desc ? 'ADDRESS_DESC' : 'ADDRESS_ASC';
  if (firstSort.id === 'servisAciklamasi') return firstSort.desc ? 'DESCRIPTION_DESC' : 'DESCRIPTION_ASC';
  if (firstSort.id === 'durum') return firstSort.desc ? 'STATUS_DESC' : 'STATUS_ASC';
  if (firstSort.id === 'irtibatKisi') return firstSort.desc ? 'CONTACT_DESC' : 'CONTACT_ASC';
  if (firstSort.id === 'telefon') return firstSort.desc ? 'PHONE_DESC' : 'PHONE_ASC';

  return 'DATE_DESC';
}

function getSortingForOption(option: ToolbarSortOption): SortingState {
  switch (option) {
    case 'DATE_ASC':
      return [{ id: 'tarih', desc: false }];
    case 'DATE_DESC':
      return [{ id: 'tarih', desc: true }];
    case 'TIME_ASC':
      return [{ id: 'saat', desc: false }];
    case 'TIME_DESC':
      return [{ id: 'saat', desc: true }];
    case 'BOAT_ASC':
      return [{ id: 'tekneAdi', desc: false }];
    case 'BOAT_DESC':
      return [{ id: 'tekneAdi', desc: true }];
    case 'ADDRESS_ASC':
      return [{ id: 'adres', desc: false }];
    case 'ADDRESS_DESC':
      return [{ id: 'adres', desc: true }];
    case 'DESCRIPTION_ASC':
      return [{ id: 'servisAciklamasi', desc: false }];
    case 'DESCRIPTION_DESC':
      return [{ id: 'servisAciklamasi', desc: true }];
    case 'STATUS_ASC':
      return [{ id: 'durum', desc: false }];
    case 'STATUS_DESC':
      return [{ id: 'durum', desc: true }];
    case 'CONTACT_ASC':
      return [{ id: 'irtibatKisi', desc: false }];
    case 'CONTACT_DESC':
      return [{ id: 'irtibatKisi', desc: true }];
    case 'PHONE_ASC':
      return [{ id: 'telefon', desc: false }];
    case 'PHONE_DESC':
      return [{ id: 'telefon', desc: true }];
    default:
      return [{ id: 'tarih', desc: true }];
  }
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

export function DataTable({ columns, data, initialState }: DataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMountedRef = React.useRef(false);
  const storageHydratedRef = React.useRef(false);
  const syncReadyRef = React.useRef(false);
  const [rows, setRows] = React.useState<ServiceGridRow[]>(() => data);
  const [statusUpdatingIds, setStatusUpdatingIds] = React.useState<Set<string>>(() => new Set());
  const [datePreset, setDatePreset] = React.useState<DatePreset>('ALL');
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>(initialState.queueFilter);
  const [viewPreset, setViewPreset] = React.useState<ServiceViewPreset>('DEFAULT');
  const [showScoring, setShowScoring] = React.useState(false);
  const [scoringService, setScoringService] = React.useState<ScoringServiceData | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tarih', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(() =>
    buildInitialColumnFilters(initialState)
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    tarihKey: false,
    lokasyonGroup: false,
  });
  const [grouping, setGrouping] = React.useState<GroupingState>(() => getInitialGrouping(initialState));
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

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
      setMultiFilterValue('lokasyonGroup', state.konum && state.konum.length > 0 ? state.konum : undefined);
      setMultiFilterValue('tarihKey', state.tarih && state.tarih.length > 0 ? state.tarih : undefined);
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

      switch (preset) {
        case 'TODAY_ACTIVE':
          setGrouping([]);
          setDatePreset('BUGUN');
          setQueueFilter('ACTIVE');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'OVERDUE':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('OVERDUE');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'UNASSIGNED':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('UNASSIGNED');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'UNSCHEDULED':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('UNSCHEDULED');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'WAITING':
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('WAITING');
          setMultiFilterValue('durum', ['PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR']);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'DEFAULT':
        default:
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('ALL');
          setMultiFilterValue('durum', [...DEFAULT_STATUS_FILTERS]);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
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

  const aktifFiltreDurumu = React.useMemo<ServisFilterState>(
    () =>
      normalizeServisFilterState({
        tekneAdi: getStringFilterValue(columnFilters, 'tekneAdi'),
        durum: getArrayFilterValue(columnFilters, 'durum'),
        konum: getArrayFilterValue(columnFilters, 'lokasyonGroup'),
        tarih: getArrayFilterValue(columnFilters, 'tarihKey'),
        queue: queueFilter,
        groupBy:
          grouping[0] === 'tekneAdi' || grouping[0] === 'lokasyonGroup' ? grouping[0] : 'none',
        datePreset,
      }),
    [columnFilters, datePreset, grouping, queueFilter]
  );

  React.useEffect(() => {
    if (!isMountedRef.current) return;
    if (!syncReadyRef.current) {
      syncReadyRef.current = true;
      return;
    }

    saveServisFilterStateToStorage(aktifFiltreDurumu);

    const hedefUrl = buildServisUrlFromFilterState(pathname, aktifFiltreDurumu);
    const mevcutQuery = searchParams.toString();
    const mevcutUrl = mevcutQuery ? `${pathname}?${mevcutQuery}` : pathname;

    if (hedefUrl !== mevcutUrl) {
      router.replace(hedefUrl, { scroll: false });
    }
  }, [aktifFiltreDurumu, pathname, router, searchParams]);

  const queueCounts = React.useMemo(() => buildQueueCounts(rows), [rows]);
  const queueFilteredRows = React.useMemo(() => applyQueueFilter(rows, queueFilter), [queueFilter, rows]);
  const presetFilteredRows = React.useMemo(
    () => applyDatePresetFilter(queueFilteredRows, datePreset),
    [datePreset, queueFilteredRows]
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
      toast.success('Puanlama kaydedildi, servis tamamlandı.');
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

  const tableMeta = React.useMemo<ServiceTableMeta>(
    () => ({
      onServiceStatusChange,
      isServiceStatusUpdating,
      onServiceDeleted,
      onCopyRowWhatsapp: handleCopyRowWhatsapp,
    }),
    [onServiceDeleted, onServiceStatusChange, isServiceStatusUpdating, handleCopyRowWhatsapp]
  );

  const groupBy: DataGridGroupBy =
    grouping[0] === 'tekneAdi' || grouping[0] === 'lokasyonGroup' ? grouping[0] : 'none';

  const table = useReactTable({
    data: presetFilteredRows,
    columns,
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
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onGroupingChange: handleGroupingChange,
    onPaginationChange: handlePaginationChange,
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
  const mobileRows = table
    .getRowModel()
    .rows.filter((row) => !row.getIsGrouped())
    .map((row) => row.original);

  const sortOption = React.useMemo(() => getSortOptionFromSorting(sorting), [sorting]);
  const tomorrowDateLabel = React.useMemo(() => {
    const tomorrow = addUtcDays(getTodayUtcNoon(), 1).toISOString().slice(0, 10);
    return formatDateDdmmyyyShortMonth(tomorrow);
  }, []);

  const handleSortOptionChange = React.useCallback((next: ToolbarSortOption) => {
    setSorting(getSortingForOption(next));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
          groupBy={groupBy}
          onGroupByChange={(next) => {
            setGrouping(next === 'none' ? [] : [next]);
          }}
          queueFilter={queueFilter}
          onQueueFilterChange={(next) => {
            setQueueFilter(next);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          queueCounts={queueCounts}
          viewPreset={viewPreset}
          onViewPresetChange={applyViewPreset}
          sortOption={sortOption}
          onSortOptionChange={handleSortOptionChange}
          isDatePresetActive={datePreset !== 'ALL'}
          onClearDatePreset={() => setDatePreset('ALL')}
        />

        <SavedFilters
          aktifFiltreDurumu={aktifFiltreDurumu}
          onFiltreYukle={applyPersistedFilterState}
        />
      </div>

      <div className="space-y-3 lg:hidden">
        {mobileRows.length > 0 ? (
          mobileRows.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => router.push(`/servisler/${service.id}/duzenle`)}
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
          ))
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
                  data-testid={`servis-row-${row.original.id}`}
                  className="cursor-pointer"
                  onClick={() => {
                    if (!row.getIsGrouped() && row.original.id) {
                      router.push(`/servisler/${row.original.id}/duzenle`);
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
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                  Filtrelere uygun kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
