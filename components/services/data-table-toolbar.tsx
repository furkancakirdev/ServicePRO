'use client';

import { Table } from '@tanstack/react-table';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QUEUE_FILTER_OPTIONS,
  QueueFilter,
  SERVICE_VIEW_PRESET_OPTIONS,
  ServiceLocationOption,
  ServiceGridRow,
  ServiceStatusOption,
  ServiceViewPreset,
} from './types';
import { FilterActiveBadges, type AktifFiltreRozeti } from '@/components/servisler/filters/FilterActiveBadges';

interface DataTableToolbarProps {
  table: Table<ServiceGridRow>;
  queueFilter: QueueFilter;
  onQueueFilterChange: (next: QueueFilter) => void;
  queueCounts: Record<QueueFilter, number>;
  viewPreset: ServiceViewPreset;
  onViewPresetChange: (next: ServiceViewPreset) => void;
  onOpenFilterDrawer: () => void;
  statusFilterOptions: ServiceStatusOption[];
  locationFilterOptions: ServiceLocationOption[];
  isDatePresetActive?: boolean;
  onClearDatePreset?: () => void;
}

export function DataTableToolbar({
  table,
  queueFilter,
  onQueueFilterChange,
  queueCounts,
  viewPreset,
  onViewPresetChange,
  onOpenFilterDrawer,
  statusFilterOptions,
  locationFilterOptions,
  isDatePresetActive = false,
  onClearDatePreset,
}: DataTableToolbarProps) {
  const tekneColumn = table.getColumn('tekneAdi');
  const durumColumn = table.getColumn('durum');
  const lokasyonColumn = table.getColumn('yer');
  const tarihColumn = table.getColumn('tarihKey');

  const searchValue = ((tekneColumn?.getFilterValue() as string | undefined) ?? '').trim();
  const activeStatusValues = ((durumColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);
  const activeLocationValues = ((lokasyonColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);
  const activeDateValues = ((tarihColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);

  const activeBadges: AktifFiltreRozeti[] = [];
  if (searchValue) {
    activeBadges.push({
      id: 'tekneAdi',
      etiket: 'Tekne',
      deger: searchValue,
      onKaldir: () => tekneColumn?.setFilterValue(undefined),
    });
  }

  if (activeStatusValues.length > 0) {
    const labels = activeStatusValues.map(
      (value) => statusFilterOptions.find((status) => status.value === value)?.label ?? value
    );
    activeBadges.push({
      id: 'durum',
      etiket: 'Durum',
      deger: labels.join(', '),
      onKaldir: () => durumColumn?.setFilterValue(undefined),
    });
  }

  if (activeLocationValues.length > 0) {
    const labels = activeLocationValues.map(
      (value) => locationFilterOptions.find((location) => location.value === value)?.label ?? value
    );
    activeBadges.push({
      id: 'lokasyon',
      etiket: 'Lokasyon',
      deger: labels.join(', '),
      onKaldir: () => lokasyonColumn?.setFilterValue(undefined),
    });
  }

  if (activeDateValues.length > 0) {
    activeBadges.push({
      id: 'tarih',
      etiket: 'Tarih',
      deger: `${activeDateValues.length} gun`,
      onKaldir: () => tarihColumn?.setFilterValue(undefined),
    });
  }

  if (queueFilter !== 'ALL') {
    activeBadges.push({
      id: 'queue',
      etiket: 'Kuyruk',
      deger: QUEUE_FILTER_OPTIONS.find((item) => item.value === queueFilter)?.label ?? queueFilter,
      onKaldir: () => onQueueFilterChange('ALL'),
    });
  }

  if (isDatePresetActive) {
    activeBadges.push({
      id: 'datePreset',
      etiket: 'Hazir Tarih',
      deger: 'Aktif',
      onKaldir: () => onClearDatePreset?.(),
    });
  }

  const clearAll = () => {
    table.resetColumnFilters();
    onQueueFilterChange('ALL');
    onClearDatePreset?.();
  };

  const selectSingleStatus = (status: string) => {
    const selected = (durumColumn?.getFilterValue() as string[] | undefined) ?? [];
    if (selected.length === 1 && selected[0] === status) {
      durumColumn?.setFilterValue(undefined);
      return;
    }
    durumColumn?.setFilterValue([status]);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/60 p-3">
      <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
        <div className="relative w-full min-w-[220px] xl:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tekne ara..."
            value={(tekneColumn?.getFilterValue() as string) ?? ''}
            onChange={(event) => tekneColumn?.setFilterValue(event.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
          <Button
            type="button"
            size="sm"
            variant={activeStatusValues.length === 0 ? 'default' : 'outline'}
            className="h-9 whitespace-nowrap"
            onClick={() => durumColumn?.setFilterValue(undefined)}
          >
            Tum Durumlar
          </Button>
          {statusFilterOptions.slice(0, 5).map((status) => (
            <Button
              key={status.value}
              type="button"
              size="sm"
              variant={activeStatusValues.includes(status.value) ? 'default' : 'outline'}
              className="h-9 whitespace-nowrap"
              onClick={() => selectSingleStatus(status.value)}
            >
              {status.label}
            </Button>
          ))}
        </div>

        <Select value={viewPreset} onValueChange={(value) => onViewPresetChange(value as ServiceViewPreset)}>
          <SelectTrigger className="h-10 w-full min-w-[210px] xl:w-[220px]">
            <SelectValue placeholder="Kayitli gorunum" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover text-popover-foreground">
            {SERVICE_VIEW_PRESET_OPTIONS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" className="h-10" onClick={onOpenFilterDrawer}>
          <Filter className="mr-2 h-4 w-4" />
          Filtreler
        </Button>
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
              className="h-9"
              onClick={() => onQueueFilterChange(option.value)}
            >
              {option.label}
              <span className="ml-2 rounded bg-black/20 px-1.5 py-0.5 text-xs">{count}</span>
            </Button>
          );
        })}
      </div>

      <FilterActiveBadges filtreler={activeBadges} onTumunuTemizle={clearAll} />
    </div>
  );
}
