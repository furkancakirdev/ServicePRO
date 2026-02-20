import type { ServisDurumu } from '@/types';
import type { OperationsOverviewDto, StatusCanonical } from '@/lib/operations/types';

export type LocationGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';
export type PresetFilter =
  | 'ALL'
  | 'FOCUS'
  | 'THIS_WEEK'
  | 'UNASSIGNED'
  | 'UNSCHEDULED'
  | 'OVERDUE'
  | 'ACTIVE';

export type { StatusCanonical, OperationsOverviewDto };

export interface ApiAssignment {
  rol?: string;
  personelAd?: string;
  personel?: {
    ad?: string;
  };
}

export interface ServiceApiItem {
  id: string;
  tarih?: string | null;
  tahminiBitisTarihi?: string | null;
  saat?: string | null;
  tekneAdi: string;
  durum: ServisDurumu;
  adres: string;
  yer?: string | null;
  isTuru: string;
  servisAciklamasi: string;
  personeller?: ApiAssignment[];
}

export interface ServicesResponse {
  services: ServiceApiItem[];
}

export interface PersonelResponseItem {
  id: string;
  aktif?: boolean;
}

export interface SelectedServiceState {
  service: ServiceApiItem;
  dateLabel: string;
}
