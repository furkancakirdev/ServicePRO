'use client';

import * as React from 'react';
import { Column, ColumnDef, FilterFn, Row, Table } from '@tanstack/react-table';
import { ArrowUpDown, CalendarClock, CheckCircle2, FileText, MessageCircleCode, PauseCircle, Package, Search, UserRoundCheck, Wrench, XCircle, type LucideIcon } from 'lucide-react';
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
import { formatDateDdmmyyyShortMonth, isDateBeforeTodayUtc, parseDateOnlyToUtcDate } from '@/lib/date-utils';
import { getStatusConfig } from '@/lib/config/status-config';
import { cn } from '@/lib/utils';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import { ServiceGridRow, ServiceTableMeta, STATUS_FILTER_OPTIONS } from './types';
import { LOKASYON_FILTER_OPTIONS } from './types';

const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  RANDEVU_VERILDI: CalendarClock,
  DEVAM_EDIYOR: Wrench,
  PARCA_BEKLIYOR: Package,
  MUSTERI_ONAY_BEKLIYOR: UserRoundCheck,
  RAPOR_BEKLIYOR: FileText,
  KESIF_KONTROL: Search,
  TAMAMLANDI: CheckCircle2,
  IPTAL: XCircle,
  ERTELENDI: PauseCircle,
};

const multiSelectFilter: FilterFn<ServiceGridRow> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? filterValue.map(String) : [];
  if (!selected.length) return true;
  return selected.includes(String(row.getValue(columnId) ?? ''));
};

function formatDateCell(value: string | null): string {
  if (!value) return '-';
  return formatDateDdmmyyyShortMonth(value);
}

function getStatusIcon(status: string): LucideIcon {
  const normalized = normalizeServisDurumuForApp(status);
  return STATUS_ICON_MAP[normalized] ?? CalendarClock;
}

function getDueDate(service: ServiceGridRow): string | null {
  return service.tahminiBitisTarihi ?? service.tarih;
}

function isServiceOverdue(service: ServiceGridRow): boolean {
  return (
    isDateBeforeTodayUtc(getDueDate(service)) &&
    service.durum !== 'TAMAMLANDI' &&
    service.durum !== 'IPTAL'
  );
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
            'h-11 min-w-[170px] border-0 px-2 text-xs font-medium shadow-none',
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
          {STATUS_FILTER_OPTIONS.map((statusOption) => {
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
    accessorKey: 'tarih',
    header: ({ column, table }) => {
      const filterColumn = table.getColumn('tarihKey');
      const selected = new Set((filterColumn?.getFilterValue() as string[] | undefined) ?? []);
      const options = Array.from(filterColumn?.getFacetedUniqueValues().entries() ?? [])
        .map(([value, count]) => {
          const raw = String(value);
          const parsed = parseDateOnlyToUtcDate(raw);
          return {
            value: raw,
            label: parsed ? formatDateDdmmyyyShortMonth(parsed.toISOString().slice(0, 10)) : raw,
            count: Number(count),
          };
        })
        .sort((a, b) => b.value.localeCompare(a.value));

      return (
        <SortableHeader
          title="Tarih"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Filtre"
              aktifFiltreSayisi={selected.size}
              dataTestId="inline-filter-tarih"
            >
              <MultiSelectFilter
                secenekler={options}
                seciliDegerler={Array.from(selected)}
                dataTestId="inline-filter-tarih"
                onDegerDegisti={(degerler) =>
                  filterColumn?.setFilterValue(degerler.length > 0 ? degerler : undefined)
                }
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    cell: ({ row }) => (
      <span className={cn(isServiceOverdue(row.original) ? 'font-medium text-destructive' : 'font-medium')}>
        {formatDateCell(row.original.tarih)}
      </span>
    ),
  },
  {
    accessorKey: 'saat',
    header: ({ column }) => <SortableHeader title="Saat" column={column} />, 
    cell: ({ row }) => <span>{row.original.saat || '--:--'}</span>,
  },
  {
    accessorKey: 'tekneAdi',
    header: ({ column, table }) => {
      const tekneColumn = table.getColumn('tekneAdi');
      const deger = ((tekneColumn?.getFilterValue() as string | undefined) ?? '').trim();

      return (
        <SortableHeader
          title="Tekne Adi"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Filtre"
              aktifFiltreSayisi={deger ? 1 : 0}
              dataTestId="inline-filter-tekneAdi"
            >
              <TextFilter
                deger={deger}
                placeholder="Tekne adı ara..."
                dataTestId="inline-filter-tekneAdi"
                onDegerDegisti={(yeniDeger) => tekneColumn?.setFilterValue(yeniDeger || undefined)}
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    enableGrouping: true,
    cell: ({ row }) => <span className="font-medium">{row.original.tekneAdi}</span>,
  },
  {
    accessorKey: 'adres',
    header: ({ column, table }) => {
      const lokasyonColumn = table.getColumn('lokasyonGroup');
      const seciliLokasyonlar = new Set((lokasyonColumn?.getFilterValue() as string[] | undefined) ?? []);
      const faceted = lokasyonColumn?.getFacetedUniqueValues();
      const lokasyonSecenekleri = LOKASYON_FILTER_OPTIONS.map((secenek) => ({
        value: secenek.value,
        label: secenek.label,
        count: Number(faceted?.get(secenek.value) ?? 0),
      }));

      return (
        <SortableHeader
          title="Adres"
          column={column}
          withFilter={
            <InlineColumnFilter
              baslik="Lokasyon"
              aktifFiltreSayisi={seciliLokasyonlar.size}
              dataTestId="inline-filter-lokasyon"
            >
              <MultiSelectFilter
                secenekler={lokasyonSecenekleri}
                seciliDegerler={Array.from(seciliLokasyonlar)}
                dataTestId="inline-filter-lokasyon"
                onDegerDegisti={(degerler) =>
                  lokasyonColumn?.setFilterValue(degerler.length > 0 ? degerler : undefined)
                }
              />
            </InlineColumnFilter>
          }
        />
      );
    },
    cell: ({ row }) => <span>{row.original.adres || '-'}</span>,
  },
  {
    accessorKey: 'lokasyonGroup',
    header: 'Lokasyon Grup',
    filterFn: multiSelectFilter,
    enableHiding: true,
    enableGrouping: true,
    cell: () => null,
  },
  {
    accessorKey: 'servisAciklamasi',
    header: ({ column }) => <SortableHeader title="Servis Aciklamasi" column={column} />,
    cell: ({ row, table }) => {
      const meta = table.options.meta as ServiceTableMeta | undefined;
      return (
        <div className="flex items-center gap-2">
          <p className="max-w-[500px] truncate" title={row.original.servisAciklamasi}>
            {row.original.servisAciklamasi}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            title="Satiri WhatsApp mesaji olarak kopyala"
            onClick={(event) => {
              event.stopPropagation();
              meta?.onCopyRowWhatsapp?.(row.original);
            }}
          >
            <MessageCircleCode className="h-4 w-4" />
            <span className="sr-only">WhatsApp satir kopyala</span>
          </Button>
        </div>
      );
    },
  },
  {
    accessorKey: 'durum',
    header: ({ column }) => {
      const selected = new Set((column.getFilterValue() as string[] | undefined) ?? []);
      const faceted = column.getFacetedUniqueValues();
      const options = STATUS_FILTER_OPTIONS.map((status) => ({
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
                onDegerDegisti={(degerler) =>
                  column.setFilterValue(degerler.length > 0 ? degerler : undefined)
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
    accessorKey: 'irtibatKisi',
    header: ({ column }) => <SortableHeader title="Irtibat Kisi" column={column} />,
    cell: ({ row }) => <span>{row.original.irtibatKisi || '-'}</span>,
  },
  {
    accessorKey: 'telefon',
    header: ({ column }) => <SortableHeader title="Telefon" column={column} />,
    cell: ({ row }) => <span>{row.original.telefon || '-'}</span>,
  },
  {
    accessorKey: 'tarihKey',
    header: 'Tarih Anahtari',
    filterFn: multiSelectFilter,
    enableHiding: true,
    cell: () => null,
  },
];
