'use client';

import { Table } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import {
  DataGridGroupBy,
  DataGridViewMode,
  LOKASYON_FILTER_OPTIONS,
  QUEUE_FILTER_OPTIONS,
  QueueFilter,
  SERVICE_VIEW_PRESET_OPTIONS,
  ServiceGridRow,
  ServiceViewPreset,
  STATUS_FILTER_OPTIONS,
} from './types';
import { formatDateOnlyTR, parseDateOnlyToUtcDate } from '@/lib/date-utils';
import { LayoutGrid, List, Search, X } from 'lucide-react';

interface DataTableToolbarProps {
  table: Table<ServiceGridRow>;
  viewMode: DataGridViewMode;
  onViewModeChange: (next: DataGridViewMode) => void;
  groupBy: DataGridGroupBy;
  onGroupByChange: (next: DataGridGroupBy) => void;
  queueFilter: QueueFilter;
  onQueueFilterChange: (next: QueueFilter) => void;
  queueCounts: Record<QueueFilter, number>;
  viewPreset: ServiceViewPreset;
  onViewPresetChange: (next: ServiceViewPreset) => void;
  isDatePresetActive?: boolean;
  onClearDatePreset?: () => void;
}

export function DataTableToolbar({
  table,
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  queueFilter,
  onQueueFilterChange,
  queueCounts,
  viewPreset,
  onViewPresetChange,
  isDatePresetActive = false,
  onClearDatePreset,
}: DataTableToolbarProps) {
  const tekneColumn = table.getColumn('tekneAdi');
  const durumColumn = table.getColumn('durum');
  const lokasyonColumn = table.getColumn('lokasyonGroup');
  const tarihColumn = table.getColumn('tarihKey');

  const dateOptions = Array.from(tarihColumn?.getFacetedUniqueValues().keys() ?? [])
    .map((value) => String(value))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => {
      const parsed = parseDateOnlyToUtcDate(value);
      return {
        value,
        label: parsed ? formatDateOnlyTR(parsed) : value,
      };
    });

  const hasFilters =
    table.getState().columnFilters.length > 0 ||
    Boolean(tekneColumn?.getFilterValue()) ||
    queueFilter !== 'ALL' ||
    isDatePresetActive;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/60 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tekne adi ara..."
            value={(tekneColumn?.getFilterValue() as string) ?? ''}
            onChange={(event) => tekneColumn?.setFilterValue(event.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
          <Select value={viewPreset} onValueChange={(value) => onViewPresetChange(value as ServiceViewPreset)}>
            <SelectTrigger className="h-9 min-w-[220px]">
              <SelectValue placeholder="Gorunum sec" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              {SERVICE_VIEW_PRESET_OPTIONS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className="h-9 flex-1"
            >
              <List className="mr-2 h-4 w-4" /> Liste
            </Button>
            <Button
              type="button"
              variant={viewMode === 'board' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewModeChange('board')}
              className="h-9 flex-1"
            >
              <LayoutGrid className="mr-2 h-4 w-4" /> Board
            </Button>
          </div>

          <Select
            value={groupBy}
            onValueChange={(value) => onGroupByChange(value as DataGridGroupBy)}
            disabled={viewMode === 'board'}
          >
            <SelectTrigger className="h-9 min-w-[220px]">
              <SelectValue placeholder="Gruplama" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
              <SelectItem value="none">Gruplama Yok</SelectItem>
              <SelectItem value="tekneAdi">Tekneye Gore</SelectItem>
              <SelectItem value="lokasyonGroup">Lokasyona Gore</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUEUE_FILTER_OPTIONS.map((option) => {
          const isActive = queueFilter === option.value;
          const count = queueCounts[option.value] ?? 0;

          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => onQueueFilterChange(option.value)}
            >
              {option.label}
              <span className="ml-2 rounded bg-black/20 px-1.5 py-0.5 text-xs">{count}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DataTableFacetedFilter title="Durum" column={durumColumn} options={STATUS_FILTER_OPTIONS} />
        <DataTableFacetedFilter
          title="Lokasyon"
          column={lokasyonColumn}
          options={LOKASYON_FILTER_OPTIONS.map((option) => ({ label: option.label, value: option.value }))}
        />
        <DataTableFacetedFilter title="Tarih" column={tarihColumn} options={dateOptions} />

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              table.resetColumnFilters();
              onGroupByChange('none');
              onQueueFilterChange('ALL');
              onClearDatePreset?.();
            }}
          >
            <X className="mr-2 h-4 w-4" /> Filtreleri Sifirla
          </Button>
        )}
      </div>
    </div>
  );
}
