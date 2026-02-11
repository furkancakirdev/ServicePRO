'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { DatePreset, DatePresetFilter } from '@/components/table/date-preset-filter';
import { DataTableToolbar } from './data-table-toolbar';
import ServisKapanisModal from '@/components/ServisKapanisModal';
import {
  ACTIVE_STATUS_VALUES,
  BOARD_STATUS_ORDER,
  DataGridGroupBy,
  DataGridViewMode,
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
import { ChevronLeft, ChevronRight, FolderTree, Layers } from 'lucide-react';

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
    uniteSaatiMuaf: boolean;
    uniteSeriNoVar: boolean;
    aciklamaYeterli: boolean;
    adamSaatVar: boolean;
    adamSaatMuaf: boolean;
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
const TODAY_ACTIVE_STATUS_SET = new Set<string>(['DEVAM_EDIYOR']);

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

function getInitialGrouping(initialState: ServiceGridInitialState): GroupingState {
  if (initialState.groupBy === 'none') return [];
  return [initialState.groupBy];
}

function formatBoardDate(value: string | null): string {
  if (!value) return 'Tarih Yok';
  return formatDateDdmmyyyShortMonth(value);
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function isTodayActiveRow(row: ServiceGridRow): boolean {
  return TODAY_ACTIVE_STATUS_SET.has(row.durum) || row.lokasyonGroup === 'DIS_SERVIS';
}

function isOverdueRow(row: ServiceGridRow): boolean {
  return isDateBeforeTodayUtc(row.tarih) && !TERMINAL_STATUS_SET.has(row.durum);
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
    case 'COMPLETED':
      return rows.filter((row) => row.durum === 'TAMAMLANDI');
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
    COMPLETED: rows.filter((row) => row.durum === 'TAMAMLANDI').length,
  };
}

function applyDatePresetFilter(rows: ServiceGridRow[], preset: DatePreset): ServiceGridRow[] {
  if (preset === 'ALL') return rows;

  const today = getTodayUtcNoon();

  if (preset === 'BUGUN') {
    const filtered = rows.filter((row) => {
      const rowDate = parseDateOnlyToUtcDate(row.tarih);
      const isToday = rowDate ? isSameUtcDay(rowDate, today) : false;
      return isToday || isTodayActiveRow(row);
    });

    return filtered
      .map((row, index) => ({
        row,
        index,
        priority: !row.tarih && isTodayActiveRow(row) ? 0 : 1,
      }))
      .sort((left, right) => left.priority - right.priority || left.index - right.index)
      .map((item) => item.row);
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

export function DataTable({ columns, data, initialState }: DataTableProps) {
  const router = useRouter();
  const isMountedRef = React.useRef(false);
  const [rows, setRows] = React.useState<ServiceGridRow[]>(() => data);
  const [statusUpdatingIds, setStatusUpdatingIds] = React.useState<Set<string>>(() => new Set());
  const [datePreset, setDatePreset] = React.useState<DatePreset>('ALL');
  const [queueFilter, setQueueFilter] = React.useState<QueueFilter>('ALL');
  const [viewPreset, setViewPreset] = React.useState<ServiceViewPreset>('DEFAULT');
  const [showScoring, setShowScoring] = React.useState(false);
  const [scoringService, setScoringService] = React.useState<ScoringServiceData | null>(null);

  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tarih', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(() =>
    buildInitialColumnFilters(initialState)
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({ tarihKey: false });
  const [grouping, setGrouping] = React.useState<GroupingState>(() =>
    initialState.viewMode === 'board' ? [] : getInitialGrouping(initialState)
  );
  const [viewMode, setViewMode] = React.useState<DataGridViewMode>(initialState.viewMode);
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

  const applyViewPreset = React.useCallback(
    (preset: ServiceViewPreset) => {
      setViewPreset(preset);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));

      switch (preset) {
        case 'TODAY_ACTIVE':
          setViewMode('list');
          setGrouping([]);
          setDatePreset('BUGUN');
          setQueueFilter('ACTIVE');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'OVERDUE':
          setViewMode('list');
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('OVERDUE');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'UNASSIGNED':
          setViewMode('list');
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('UNASSIGNED');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'COMPLETED':
          setViewMode('list');
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('COMPLETED');
          setMultiFilterValue('durum', ['TAMAMLANDI']);
          setMultiFilterValue('lokasyonGroup', undefined);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'FIELD_BOARD':
          setViewMode('board');
          setGrouping([]);
          setDatePreset('ALL');
          setQueueFilter('ACTIVE');
          setMultiFilterValue('durum', undefined);
          setMultiFilterValue('lokasyonGroup', ['DIS_SERVIS']);
          setMultiFilterValue('tarihKey', undefined);
          break;
        case 'DEFAULT':
        default:
          setViewMode('list');
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
    if (isMountedRef.current) {
      setRows(data);
    }
  }, [data]);

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
      throw new Error(payload?.error || 'Servis detaylari alinamadi');
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
      setRows((prev) => prev.map((item) => (item.id === servisId ? { ...item, durum: 'TAMAMLANDI' } : item)));
      setShowScoring(false);
      setScoringService(null);
      toast.success('Puanlama kaydedildi, servis tamamlandi.');
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
      toast.info('Tamamlandi durumuna gecmek icin puanlama gerekli.');
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
          const message = error instanceof Error ? error.message : 'Puanlama ekrani acilamadi';
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
          throw new Error(payload?.error || 'Durum guncellenemedi');
        }

        toast.success('Servis durumu guncellendi');
        router.refresh();
      } catch (error) {
        if (isMountedRef.current) {
          setRows((prev) =>
            prev.map((item) => (item.id === serviceId ? { ...item, durum: previousStatus } : item))
          );
        }
        const message = error instanceof Error ? error.message : 'Durum guncellemesi basarisiz';
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

  const tableMeta = React.useMemo<ServiceTableMeta>(
    () => ({
      onServiceStatusChange,
      isServiceStatusUpdating,
      onServiceDeleted,
    }),
    [onServiceDeleted, onServiceStatusChange, isServiceStatusUpdating]
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

  const boardColumns = BOARD_STATUS_ORDER.map((status) => {
    const items = sortedRows.filter((row) => row.durum === status);
    return {
      status,
      items,
      config: getStatusConfig(status),
    };
  }).filter((column) => column.items.length > 0);

  return (
    <div className="space-y-4">
      <DatePresetFilter
        value={datePreset}
        onChange={(next) => {
          setDatePreset(next);
          setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        }}
      />

      <DataTableToolbar
        table={table}
        viewMode={viewMode}
        onViewModeChange={(next) => {
          setViewMode(next);
          if (next === 'board') setGrouping([]);
        }}
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
        isDatePresetActive={datePreset !== 'ALL'}
        onClearDatePreset={() => setDatePreset('ALL')}
      />

      {viewMode === 'board' ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[1080px] gap-3">
            {boardColumns.map((column) => (
              <div
                key={column.status}
                className="w-[280px] shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border)]/60 p-3">
                  <Badge className={`${column.config.bgColor} ${column.config.color} border-0`}>
                    {column.config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{column.items.length}</span>
                </div>
                <div className="max-h-[68vh] space-y-2 overflow-y-auto p-3">
                  {column.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(`/servisler/${item.id}/duzenle`)}
                      className="w-full rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-bg)]/40 p-3 text-left transition hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-surface)]/80"
                    >
                      <p className="truncate text-sm font-semibold text-foreground">{item.tekneAdi}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.yer || item.adres}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatBoardDate(item.tarih)} - {item.saat || '--:--'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {boardColumns.length === 0 && (
              <div className="w-full rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-muted-foreground">
                Filtrelere uygun kayit bulunamadi.
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/60">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
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
                      Filtrelere uygun kayit bulunamadi.
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
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Sayfa Boyutu" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
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
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Onceki
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Sonraki <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
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
