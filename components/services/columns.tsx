'use client';

import * as React from 'react';
import { Column, ColumnDef, FilterFn, Row, Table } from '@tanstack/react-table';
import {
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  PauseCircle,
  Search,
  UserRoundCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { InlineColumnFilter } from '@/components/servisler/filters/InlineColumnFilter';
import { MultiSelectFilter } from '@/components/servisler/filters/MultiSelectFilter';
import { TextFilter } from '@/components/servisler/filters/TextFilter';
import { formatDateDdmmyyyShortMonth, isDateBeforeTodayUtc } from '@/lib/date-utils';
import { getStatusConfig } from '@/lib/config/status-config';
import { cn } from '@/lib/utils';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import {
  PRIORITY_FILTER_OPTIONS,
  ServiceLocationOption,
  ServiceGridRow,
  ServiceStatusOption,
  ServiceTableMeta,
  STATUS_FILTER_OPTIONS,
} from './types';

const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  RANDEVU_VERILDI: CalendarClock,
  DEVAM_EDIYOR: Wrench,
  PARCA_BEKLIYOR: Search,
  MUSTERI_ONAY_BEKLIYOR: UserRoundCheck,
  TAMAMLANDI: CheckCircle2,
  IPTAL: XCircle,
  ERTELENDI: PauseCircle,
};

const multiSelectFilter: FilterFn<ServiceGridRow> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? filterValue.map(String) : [];
  if (!selected.length) return true;
  return selected.includes(String(row.getValue(columnId) ?? ''));
};

function getStatusIcon(status: string): LucideIcon {
  const normalized = normalizeServisDurumuForApp(status);
  return STATUS_ICON_MAP[normalized] ?? CalendarClock;
}

function tekilSecenekleriBirlestir<T extends { value: string; label: string }>(
  ilk: T[],
  ikinci: T[]
): T[] {
  const gorulen = new Set<string>();
  const sonuc: T[] = [];

  for (const secenek of [...ilk, ...ikinci]) {
    const key = secenek.value.trim();
    if (!key || gorulen.has(key)) continue;
    gorulen.add(key);
    sonuc.push({ ...secenek, value: key });
  }

  return sonuc;
}

function durumSecenekleriniGetir(table: Table<ServiceGridRow>): ServiceStatusOption[] {
  const meta = table.options.meta as ServiceTableMeta | undefined;
  const metaSecenekleri = (meta?.statusOptions ?? []).filter((secenek) => secenek.value.trim().length > 0);
  if (metaSecenekleri.length > 0) return metaSecenekleri;

  const faceted = table.getColumn('durum')?.getFacetedUniqueValues();
  if (!faceted || faceted.size === 0) return STATUS_FILTER_OPTIONS;

  const dinamikSecenekler = Array.from(faceted.keys())
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => ({
      value,
      label: getStatusConfig(value).label,
    }));

  return tekilSecenekleriBirlestir(dinamikSecenekler, STATUS_FILTER_OPTIONS);
}

function lokasyonSecenekleriniGetir(table: Table<ServiceGridRow>): ServiceLocationOption[] {
  const meta = table.options.meta as ServiceTableMeta | undefined;
  const metaSecenekleri = (meta?.locationOptions ?? []).filter(
    (secenek) => secenek.value.trim().length > 0
  );
  const faceted = table.getColumn('yer')?.getFacetedUniqueValues();
  const dinamikSecenekler: ServiceLocationOption[] = faceted
    ? Array.from(faceted.keys())
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map((value) => ({
          value,
          label: metaSecenekleri.find((secenek) => secenek.value === value)?.label ?? value,
        }))
    : [];

  return tekilSecenekleriBirlestir(metaSecenekleri, dinamikSecenekler);
}

function isServiceOverdue(service: ServiceGridRow): boolean {
  const dueDate = service.tahminiBitisTarihi ?? service.tarih;
  return isDateBeforeTodayUtc(dueDate) && service.durum !== 'TAMAMLANDI' && service.durum !== 'IPTAL';
}

function getPriorityStyle(priority: ServiceGridRow['oncelik']): string {
  if (priority === 'YUKSEK') return 'bg-rose-500/15 text-rose-600 border-rose-300/60';
  if (priority === 'ORTA') return 'bg-amber-500/15 text-amber-700 border-amber-300/60';
  return 'bg-emerald-500/15 text-emerald-700 border-emerald-300/60';
}

const QuickStatusSelect = React.memo(function QuickStatusSelect({
  row,
  table,
}: {
  row: Row<ServiceGridRow>;
  table: Table<ServiceGridRow>;
}) {
  const meta = table.options.meta as ServiceTableMeta | undefined;
  const service = row.original;
  const currentStatus = service.durum;
  const statusConfig = getStatusConfig(currentStatus);
  const CurrentIcon = getStatusIcon(currentStatus);
  const isPending = meta?.isServiceStatusUpdating(service.id) ?? false;
  const statusOptions = durumSecenekleriniGetir(table);

  const handleStatusChange = (nextStatus: string) => {
    if (!meta) return;
    if (nextStatus === currentStatus) return;
    void meta.onServiceStatusChange(service.id, nextStatus);
  };

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Select value={currentStatus} onValueChange={handleStatusChange} disabled={!meta || isPending}>
        <SelectTrigger
          className={cn(
            'h-10 min-w-[168px] border-0 px-2 text-xs font-medium shadow-none',
            statusConfig.bgColor,
            statusConfig.color
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 truncate">
            <CurrentIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{statusConfig.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent
          align="end"
          className="border-border bg-popover text-popover-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          {statusOptions.map((statusOption) => {
            const OptionIcon = getStatusIcon(statusOption.value);
            return (
              <SelectItem key={statusOption.value} value={statusOption.value}>
                <div className="flex items-center gap-2">
                  <OptionIcon className="h-3.5 w-3.5" />
                  <span>{statusOption.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
});

function SortableHeader({
  title,
  column,
  withFilter,
}: {
  title: string;
  column: Column<ServiceGridRow, unknown>;
  withFilter?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        className="px-0 text-xs font-semibold uppercase tracking-wide"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      {withFilter}
    </div>
  );
}

export const serviceColumns: ColumnDef<ServiceGridRow>[] = [
  {
    accessorKey: 'tekneAdi',
    header: ({ column, table }) => {
      const tekneColumn = table.getColumn('tekneAdi');
      const value = ((tekneColumn?.getFilterValue() as string | undefined) ?? '').trim();

      return (
        <SortableHeader
          title="Tekne"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Filtre"
              aktifFiltreSayisi={value ? 1 : 0}
              dataTestId="inline-filter-tekneAdi"
            >
              <TextFilter
                deger={value}
                placeholder="Tekne ara..."
                dataTestId="inline-filter-tekneAdi"
                onDegerDegisti={(nextValue) => tekneColumn?.setFilterValue(nextValue || undefined)}
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    cell: ({ row }) => <span className="font-medium">{row.original.tekneAdi}</span>,
  },
  {
    accessorKey: 'servisAciklamasi',
    header: ({ column }) => <SortableHeader title="Baslik/Ozet" column={column} />,
    cell: ({ row }) => (
      <div className="max-w-[440px]">
        <p className="truncate font-medium text-foreground" title={row.original.servisAciklamasi}>
          {row.original.servisAciklamasi}
        </p>
        <p className="truncate text-xs text-muted-foreground">{row.original.adres || '-'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'durum',
    header: ({ column, table }) => {
      const selected = new Set((column.getFilterValue() as string[] | undefined) ?? []);
      const faceted = column.getFacetedUniqueValues();
      const options = durumSecenekleriniGetir(table).map((status) => ({
        value: status.value,
        label: status.label,
        count: Number(faceted?.get(status.value) ?? 0),
      }));

      return (
        <SortableHeader
          title="Durum"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Filtre"
              aktifFiltreSayisi={selected.size}
              dataTestId="inline-filter-durum"
            >
              <MultiSelectFilter
                secenekler={options}
                seciliDegerler={Array.from(selected)}
                dataTestId="inline-filter-durum"
                onDegerDegisti={(values) =>
                  column.setFilterValue(values.length > 0 ? values : undefined)
                }
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    filterFn: multiSelectFilter,
    cell: ({ row, table }) => <QuickStatusSelect row={row} table={table} />,
  },
  {
    accessorKey: 'oncelik',
    header: ({ column }) => <SortableHeader title="Oncelik" column={column} />,
    filterFn: multiSelectFilter,
    cell: ({ row }) => (
      <Badge className={cn('border text-xs', getPriorityStyle(row.original.oncelik))}>
        {PRIORITY_FILTER_OPTIONS.find((item) => item.value === row.original.oncelik)?.label ?? row.original.oncelik}
      </Badge>
    ),
  },
  {
    accessorKey: 'yer',
    header: ({ column, table }) => {
      const lokasyonColumn = table.getColumn('yer');
      const selected = new Set((lokasyonColumn?.getFilterValue() as string[] | undefined) ?? []);
      const faceted = lokasyonColumn?.getFacetedUniqueValues();
      const options = lokasyonSecenekleriniGetir(table).map((option) => ({
        value: option.value,
        label: option.label,
        count: Number(faceted?.get(option.value) ?? 0),
      }));

      return (
        <SortableHeader
          title="Lokasyon"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Lokasyon"
              aktifFiltreSayisi={selected.size}
              dataTestId="inline-filter-lokasyon"
            >
              <MultiSelectFilter
                secenekler={options}
                seciliDegerler={Array.from(selected)}
                dataTestId="inline-filter-lokasyon"
                onDegerDegisti={(values) =>
                  lokasyonColumn?.setFilterValue(values.length > 0 ? values : undefined)
                }
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    filterFn: multiSelectFilter,
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-foreground">{row.original.yer || '-'}</p>
        <p className="text-xs text-muted-foreground">{row.original.lokasyonGroup}</p>
      </div>
    ),
  },
  {
    accessorKey: 'atananTeknisyenler',
    header: ({ column }) => <SortableHeader title="Atanan" column={column} />,
    cell: ({ row }) => {
      const names = row.original.atananTeknisyenler;
      if (names.length === 0) {
        return <span className="text-sm text-muted-foreground">Atama bekliyor</span>;
      }
      if (names.length <= 2) {
        return <span className="text-sm">{names.join(', ')}</span>;
      }
      return (
        <span className="text-sm">
          {names.slice(0, 2).join(', ')} +{names.length - 2}
        </span>
      );
    },
  },
  {
    accessorKey: 'tarih',
    header: ({ column }) => <SortableHeader title="Tarih" column={column} />,
    cell: ({ row }) => {
      const dateText = row.original.tarih ? formatDateDdmmyyyShortMonth(row.original.tarih) : 'Tarihsiz';
      return (
        <div className={cn('text-sm', isServiceOverdue(row.original) ? 'font-semibold text-destructive' : '')}>
          <div>{dateText}</div>
          <div className="text-xs text-muted-foreground">{row.original.saat || '--:--'}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'lokasyonGroup',
    header: 'Lokasyon Grup',
    filterFn: multiSelectFilter,
    enableHiding: true,
    cell: () => null,
  },
  {
    accessorKey: 'tarihKey',
    header: 'Tarih Anahtari',
    filterFn: multiSelectFilter,
    enableHiding: true,
    cell: () => null,
  },
  {
    accessorKey: 'blokajNedeni',
    header: 'Blokaj Nedeni',
    filterFn: multiSelectFilter,
    enableHiding: true,
    cell: () => null,
  },
];
