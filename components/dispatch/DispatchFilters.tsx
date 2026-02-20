'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  DispatchConfirmedFilter,
  DispatchFiltersState,
  DispatchPersonelOption,
} from './types';

type Props = {
  filters: DispatchFiltersState;
  onChange: (next: DispatchFiltersState) => void;
  locationOptions: Array<{ key: string; label: string }>;
  statusOptions: string[];
  personeller: DispatchPersonelOption[];
};

const CONFIRMED_OPTIONS: Array<{ value: DispatchConfirmedFilter; label: string }> = [
  { value: 'all', label: 'Tum Confirm Durumlari' },
  { value: 'confirmed', label: 'Sadece Confirmed' },
  { value: 'unconfirmed', label: 'Sadece Unconfirmed' },
];

export function DispatchFilters({
  filters,
  onChange,
  locationOptions,
  statusOptions,
  personeller,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
      <Select
        value={filters.konum}
        onValueChange={(value) => onChange({ ...filters, konum: value })}
      >
        <SelectTrigger data-testid="dispatch-filter-location">
          <SelectValue placeholder="Lokasyon secin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tum Lokasyonlar</SelectItem>
          {locationOptions.map((item) => (
            <SelectItem key={item.key} value={item.key}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.durum}
        onValueChange={(value) => onChange({ ...filters, durum: value })}
      >
        <SelectTrigger data-testid="dispatch-filter-status">
          <SelectValue placeholder="Durum secin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tum Durumlar</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.confirmed}
        onValueChange={(value) =>
          onChange({ ...filters, confirmed: value as DispatchConfirmedFilter })
        }
      >
        <SelectTrigger data-testid="dispatch-filter-confirmed">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CONFIRMED_OPTIONS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.personelId}
        onValueChange={(value) => onChange({ ...filters, personelId: value })}
      >
        <SelectTrigger data-testid="dispatch-filter-personel">
          <SelectValue placeholder="Teknisyen secin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tum Teknisyenler</SelectItem>
          {personeller.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.ad}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default DispatchFilters;
