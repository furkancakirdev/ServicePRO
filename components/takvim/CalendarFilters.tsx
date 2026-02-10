'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Filter, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
  lokasyon: string | null;
  baslangic: string;
  bitis: string;
  durum: string | null;
}

interface CalendarFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

const LOKASYONLAR = [
  { value: 'DIS_SERVIS', label: 'Dış Servis', color: 'bg-blue-500/20 text-blue-200 border-blue-400/40', icon: MapPin },
  { value: 'NETSEL', label: 'Netsel', color: 'bg-green-500/20 text-green-200 border-green-400/40', icon: MapPin },
  { value: 'YATMARIN', label: 'Yatmarin', color: 'bg-orange-500/20 text-orange-200 border-orange-400/40', icon: MapPin },
];

const DURUMLER = [
  { value: 'RANDEVU_VERILDI', label: 'Randevu Verildi', color: 'bg-blue-500' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor', color: 'bg-amber-500' },
  { value: 'PARCA_BEKLIYOR', label: 'Parça Bekliyor', color: 'bg-red-500' },
  { value: 'MUSTERI_ONAY_BEKLIYOR', label: 'Müşteri Onay Bekliyor', color: 'bg-violet-500' },
  { value: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor', color: 'bg-pink-500' },
  { value: 'KESIF_KONTROL', label: 'Keşif/Kontrol', color: 'bg-cyan-500' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı', color: 'bg-green-500' },
];

export function CalendarFilters({ onFilterChange, className }: CalendarFiltersProps) {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [filters, setFilters] = useState<FilterState>({
    lokasyon: null,
    baslangic: firstDay.toISOString().split('T')[0],
    bitis: lastDay.toISOString().split('T')[0],
    durum: null,
  });

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const cleared: FilterState = { lokasyon: null, baslangic: '', bitis: '', durum: null };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = filters.lokasyon || filters.baslangic || filters.bitis || filters.durum;
  const activeFilterCount = [filters.lokasyon, filters.baslangic, filters.durum].filter(Boolean).length;

  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 rounded-lg border surface-panel',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="font-medium text-[var(--color-text)]">Filtreler</span>
        </div>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFilterCount} aktif
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-sm text-[var(--color-text-muted)]">Lokasyon:</span>
        <div className="flex gap-1.5 flex-wrap">
          {LOKASYONLAR.map((lok) => {
            const Icon = lok.icon;
            const isActive = filters.lokasyon === lok.value;
            return (
              <Badge
                key={lok.value}
                className={cn(
                  'cursor-pointer transition-all hover:opacity-90 border',
                  lok.color,
                  isActive ? 'ring-2 ring-offset-1 ring-[var(--color-primary)] opacity-100' : 'opacity-55'
                )}
                onClick={() => updateFilter('lokasyon', filters.lokasyon === lok.value ? null : lok.value)}
              >
                <Icon className="w-3 h-3 mr-1" />
                {lok.label}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-sm text-[var(--color-text-muted)]">Durum:</span>
        <Select value={filters.durum || 'ALL'} onValueChange={(v) => updateFilter('durum', v === 'ALL' ? null : v)}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Tümü" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tümü</SelectItem>
            {DURUMLER.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', d.color)} />
                  {d.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
        <span className="text-sm text-[var(--color-text-muted)]">Tarih:</span>
        <Input type="date" value={filters.baslangic} onChange={(e) => updateFilter('baslangic', e.target.value)} className="w-36 h-8" />
        <span className="text-[var(--color-text-muted)]">-</span>
        <Input
          type="date"
          value={filters.bitis}
          onChange={(e) => updateFilter('bitis', e.target.value)}
          className="w-36 h-8"
          min={filters.baslangic || undefined}
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <X className="w-4 h-4 mr-1" />
          Temizle
        </Button>
      )}
    </div>
  );
}

export default CalendarFilters;

