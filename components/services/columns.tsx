'use client';

import * as React from 'react';
import { ColumnDef, FilterFn, Row, Table } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { formatDateDdmmyyyShortMonth, isDateBeforeTodayUtc } from '@/lib/date-utils';
import { getStatusConfig } from '@/lib/config/status-config';
import { cn } from '@/lib/utils';
import { DataTableRowActions } from '@/components/table/data-table-row-actions';
import { ServiceGridRow, ServiceTableMeta, STATUS_FILTER_OPTIONS } from './types';

const multiSelectFilter: FilterFn<ServiceGridRow> = (row, columnId, filterValue) => {
  const selected = Array.isArray(filterValue) ? filterValue.map(String) : [];
  if (!selected.length) return true;
  return selected.includes(String(row.getValue(columnId) ?? ''));
};

function formatDateCell(value: string | null): string {
  if (!value) return 'Tarih Yok';
  return formatDateDdmmyyyShortMonth(value);
}

function isServiceOverdue(service: ServiceGridRow): boolean {
  return (
    isDateBeforeTodayUtc(service.tarih) &&
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
            'h-8 min-w-[170px] border-0 px-2 text-xs font-medium shadow-none',
            statusConfig.bgColor,
            statusConfig.color
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <SelectValue placeholder="Durum sec" />
        </SelectTrigger>
        <SelectContent
          align="end"
          className="border-slate-800 bg-slate-900 text-slate-100"
          onClick={(event) => event.stopPropagation()}
        >
          {STATUS_FILTER_OPTIONS.map((statusOption) => (
            <SelectItem key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

export const serviceColumns: ColumnDef<ServiceGridRow>[] = [
  {
    accessorKey: 'tarih',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 text-xs font-semibold uppercase tracking-wide"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Tarih
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex min-w-[124px] flex-col">
        <span
          className={cn(
            'font-medium',
            isServiceOverdue(row.original) ? 'text-red-400' : 'text-foreground'
          )}
        >
          {formatDateCell(row.original.tarih)}
        </span>
        <span className="text-xs text-muted-foreground">{row.original.saat || '--:--'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'tekneAdi',
    header: 'Tekne / Lokasyon',
    enableGrouping: true,
    cell: ({ row }) => (
      <div className="flex min-w-[220px] flex-col">
        <span className="font-medium text-foreground">{row.original.tekneAdi}</span>
        <span className="truncate text-xs text-muted-foreground" title={row.original.yer || row.original.adres}>
          {row.original.yer || row.original.adres || '-'}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'lokasyonGroup',
    header: 'Lokasyon',
    enableGrouping: true,
    filterFn: multiSelectFilter,
    cell: ({ row }) => {
      const value = row.original.lokasyonGroup;
      const label = value === 'YATMARIN' ? 'Yatmarin' : value === 'NETSEL' ? 'Netsel' : 'Dis Servis';

      return (
        <Badge variant="secondary" className="font-medium">
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'servisAciklamasi',
    header: 'Servis Aciklamasi',
    cell: ({ row }) => (
      <div className="max-w-[460px]">
        <p className="line-clamp-2 text-sm text-foreground">{row.original.servisAciklamasi}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.irtibatKisi || 'Irtibat yok'}
          {row.original.telefon ? ` • ${row.original.telefon}` : ''}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'personelSayisi',
    header: 'Ekip',
    cell: ({ row }) => {
      const personelCount = row.original.personelSayisi;
      return (
        <Badge
          variant="secondary"
          className={cn(
            'font-medium',
            personelCount === 0
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          )}
        >
          {personelCount === 0 ? 'Atanmamis' : `${personelCount} kisi`}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'durum',
    header: 'Durum',
    enableGrouping: true,
    filterFn: multiSelectFilter,
    cell: ({ row, table }) => <QuickStatusSelect row={row} table={table} />,
  },
  {
    accessorKey: 'tarihKey',
    header: 'Tarih Anahtari',
    filterFn: multiSelectFilter,
    enableHiding: true,
    cell: () => null,
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row, table }) => {
      const meta = table.options.meta as ServiceTableMeta | undefined;

      return (
        <div onClick={(event) => event.stopPropagation()}>
          <DataTableRowActions row={row} onDeleted={meta?.onServiceDeleted} />
        </div>
      );
    },
  },
];
