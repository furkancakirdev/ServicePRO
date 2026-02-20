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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DataGridGroupBy,
  LOKASYON_FILTER_OPTIONS,
  QUEUE_FILTER_OPTIONS,
  QueueFilter,
  SERVICE_VIEW_PRESET_OPTIONS,
  ServiceGridRow,
  ServiceViewPreset,
  STATUS_FILTER_OPTIONS,
} from './types';
import { FilterActiveBadges, type AktifFiltreRozeti } from '@/components/servisler/filters/FilterActiveBadges';
import { formatDateOnlyTR, parseDateOnlyToUtcDate } from '@/lib/date-utils';
import { Search, Settings2 } from 'lucide-react';

export type ToolbarSortOption =
  | 'DATE_DESC'
  | 'DATE_ASC'
  | 'TIME_ASC'
  | 'TIME_DESC'
  | 'BOAT_ASC'
  | 'BOAT_DESC'
  | 'ADDRESS_ASC'
  | 'ADDRESS_DESC'
  | 'DESCRIPTION_ASC'
  | 'DESCRIPTION_DESC'
  | 'STATUS_ASC'
  | 'STATUS_DESC'
  | 'CONTACT_ASC'
  | 'CONTACT_DESC'
  | 'PHONE_ASC'
  | 'PHONE_DESC';

const COLUMN_LABELS: Record<string, string> = {
  tarih: 'Tarih',
  saat: 'Saat',
  tekneAdi: 'Tekne Adi',
  adres: 'Adres',
  servisAciklamasi: 'Servis Aciklamasi',
  durum: 'Durum',
  irtibatKisi: 'Irtibat Kisi',
  telefon: 'Telefon',
};

interface DataTableToolbarProps {
  table: Table<ServiceGridRow>;
  groupBy: DataGridGroupBy;
  onGroupByChange: (next: DataGridGroupBy) => void;
  queueFilter: QueueFilter;
  onQueueFilterChange: (next: QueueFilter) => void;
  queueCounts: Record<QueueFilter, number>;
  viewPreset: ServiceViewPreset;
  onViewPresetChange: (next: ServiceViewPreset) => void;
  sortOption: ToolbarSortOption;
  onSortOptionChange: (next: ToolbarSortOption) => void;
  isDatePresetActive?: boolean;
  onClearDatePreset?: () => void;
}

export function DataTableToolbar({
  table,
  groupBy,
  onGroupByChange,
  queueFilter,
  onQueueFilterChange,
  queueCounts,
  viewPreset,
  onViewPresetChange,
  sortOption,
  onSortOptionChange,
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

  const statusLabelMap = new Map<string, string>(
    STATUS_FILTER_OPTIONS.map((option) => [String(option.value), option.label])
  );
  const locationLabelMap = new Map<string, string>(
    LOKASYON_FILTER_OPTIONS.map((option) => [String(option.value), option.label])
  );
  const queueLabel = QUEUE_FILTER_OPTIONS.find((option) => option.value === queueFilter)?.label;
  const searchValue = ((tekneColumn?.getFilterValue() as string | undefined) ?? '').trim();
  const activeStatusValues = ((durumColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);
  const activeLocationValues = ((lokasyonColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);
  const activeDateValues = ((tarihColumn?.getFilterValue() as string[] | undefined) ?? []).filter(Boolean);
  const visibleColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.getCanHide() &&
        column.id !== 'tarihKey' &&
        column.id !== 'lokasyonGroup'
    );
  const seciliLokasyon = activeLocationValues.length === 1 ? activeLocationValues[0] : null;

  const aktifFiltreRozetleri: AktifFiltreRozeti[] = [];
  if (searchValue) {
    aktifFiltreRozetleri.push({
      id: 'tekneAdi',
      etiket: 'Tekne',
      deger: searchValue,
      onKaldir: () => tekneColumn?.setFilterValue(undefined),
    });
  }
  if (activeStatusValues.length > 0) {
    const labels = activeStatusValues.map((value) => statusLabelMap.get(value) ?? value);
    aktifFiltreRozetleri.push({
      id: 'durum',
      etiket: 'Durum',
      deger: labels.join(', '),
      onKaldir: () => durumColumn?.setFilterValue(undefined),
    });
  }
  if (activeLocationValues.length > 0) {
    const labels = activeLocationValues.map((value) => locationLabelMap.get(value) ?? value);
    aktifFiltreRozetleri.push({
      id: 'lokasyonGroup',
      etiket: 'Lokasyon',
      deger: labels.join(', '),
      onKaldir: () => lokasyonColumn?.setFilterValue(undefined),
    });
  }
  if (activeDateValues.length > 0) {
    const labels = activeDateValues
      .map((value) => dateOptions.find((option) => option.value === value)?.label ?? value)
      .join(', ');
    aktifFiltreRozetleri.push({
      id: 'tarihKey',
      etiket: 'Tarih',
      deger: labels,
      onKaldir: () => tarihColumn?.setFilterValue(undefined),
    });
  }
  if (queueFilter !== 'ALL' && queueLabel) {
    aktifFiltreRozetleri.push({
      id: 'queue',
      etiket: 'Kuyruk',
      deger: queueLabel,
      onKaldir: () => onQueueFilterChange('ALL'),
    });
  }
  if (isDatePresetActive) {
    aktifFiltreRozetleri.push({
      id: 'datePreset',
      etiket: 'Hazır Tarih',
      deger: 'Aktif',
      onKaldir: () => onClearDatePreset?.(),
    });
  }

  const tumFiltreleriTemizle = () => {
    table.resetColumnFilters();
    onGroupByChange('none');
    onQueueFilterChange('ALL');
    onClearDatePreset?.();
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/60 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tekne adı ara..."
            value={(tekneColumn?.getFilterValue() as string) ?? ''}
            onChange={(event) => tekneColumn?.setFilterValue(event.target.value)}
            className="h-11 pl-9"
          />
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
          <Select value={viewPreset} onValueChange={(value) => onViewPresetChange(value as ServiceViewPreset)}>
            <SelectTrigger className="h-11 min-w-[220px]">
              <SelectValue placeholder="Görünüm seç" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              {SERVICE_VIEW_PRESET_OPTIONS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={(value) => onSortOptionChange(value as ToolbarSortOption)}>
            <SelectTrigger className="h-11 min-w-[220px]">
              <SelectValue placeholder="Sıralama" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              <SelectItem value="DATE_DESC">Tarih (Yeniden Eskiye)</SelectItem>
              <SelectItem value="DATE_ASC">Tarih (Eskiden Yeniye)</SelectItem>
              <SelectItem value="TIME_ASC">Saat (A dan Z ye)</SelectItem>
              <SelectItem value="TIME_DESC">Saat (Z den A ya)</SelectItem>
              <SelectItem value="BOAT_ASC">Tekne (A dan Z ye)</SelectItem>
              <SelectItem value="BOAT_DESC">Tekne (Z den A ya)</SelectItem>
              <SelectItem value="ADDRESS_ASC">Adres (A dan Z ye)</SelectItem>
              <SelectItem value="ADDRESS_DESC">Adres (Z den A ya)</SelectItem>
              <SelectItem value="DESCRIPTION_ASC">Açıklama (A dan Z ye)</SelectItem>
              <SelectItem value="DESCRIPTION_DESC">Açıklama (Z den A ya)</SelectItem>
              <SelectItem value="STATUS_ASC">Durum (A dan Z ye)</SelectItem>
              <SelectItem value="STATUS_DESC">Durum (Z den A ya)</SelectItem>
              <SelectItem value="CONTACT_ASC">İrtibat Kişi (A dan Z ye)</SelectItem>
              <SelectItem value="CONTACT_DESC">İrtibat Kişi (Z den A ya)</SelectItem>
              <SelectItem value="PHONE_ASC">Telefon (A dan Z ye)</SelectItem>
              <SelectItem value="PHONE_DESC">Telefon (Z den A ya)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={(value) => onGroupByChange(value as DataGridGroupBy)}>
            <SelectTrigger className="h-11 min-w-[220px]">
              <SelectValue placeholder="Gruplama" />
            </SelectTrigger>
            <SelectContent className="border-border bg-popover text-popover-foreground">
              <SelectItem value="none">Gruplama Yok</SelectItem>
              <SelectItem value="tekneAdi">Tekneye Göre</SelectItem>
              <SelectItem value="lokasyonGroup">Lokasyona Göre</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-11 min-w-[180px] justify-start">
                <Settings2 className="mr-2 h-4 w-4" />
                Sutun Gorunurlugu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 border-border bg-popover text-popover-foreground">
              <DropdownMenuLabel>Gosterilecek sutunlar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {visibleColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                >
                  {COLUMN_LABELS[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              className="h-11"
              onClick={() => onQueueFilterChange(option.value)}
            >
              {option.label}
              <span className="ml-2 rounded bg-black/20 px-1.5 py-0.5 text-xs">{count}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={seciliLokasyon === null ? 'default' : 'outline'}
          size="sm"
          className="h-11"
          onClick={() => lokasyonColumn?.setFilterValue(undefined)}
        >
          Hepsi
        </Button>
        {LOKASYON_FILTER_OPTIONS.map((secenek) => {
          const aktifMi = seciliLokasyon === secenek.value;
          return (
            <Button
              key={secenek.value}
              type="button"
              variant={aktifMi ? 'default' : 'outline'}
              size="sm"
              className="h-11"
              onClick={() => lokasyonColumn?.setFilterValue([secenek.value])}
            >
              {secenek.label}
            </Button>
          );
        })}
      </div>

      <FilterActiveBadges filtreler={aktifFiltreRozetleri} onTumunuTemizle={tumFiltreleriTemizle} />
    </div>
  );
}
