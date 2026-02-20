export type LokasyonGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

export type DataGridViewMode = 'list';

export type DataGridGroupBy = 'none' | 'tekneAdi' | 'lokasyonGroup';

export type QueueFilter = 'ALL' | 'ACTIVE' | 'OVERDUE' | 'UNASSIGNED' | 'UNSCHEDULED' | 'WAITING';

export type ServiceViewPreset =
  | 'DEFAULT'
  | 'TODAY_ACTIVE'
  | 'OVERDUE'
  | 'UNASSIGNED'
  | 'UNSCHEDULED'
  | 'WAITING';

export interface ServiceGridRow {
  id: string;
  tarih: string | null;
  tahminiBitisTarihi: string | null;
  tarihKey: string;
  saat: string | null;
  tekneAdi: string;
  adres: string;
  yer: string;
  lokasyonGroup: LokasyonGroup;
  servisAciklamasi: string;
  irtibatKisi: string | null;
  telefon: string | null;
  durum: string;
  personelSayisi: number;
  isTuru: string;
  createdAt: string;
}

export interface ServiceGridInitialState {
  search: string;
  statuses: string[];
  lokasyonGroups: LokasyonGroup[];
  dateKeys: string[];
  queueFilter: QueueFilter;
  viewMode: DataGridViewMode;
  groupBy: DataGridGroupBy;
}

export interface ServiceTableMeta {
  onServiceStatusChange: (
    serviceId: string,
    nextStatus: string
  ) => Promise<void>;
  isServiceStatusUpdating: (serviceId: string) => boolean;
  onServiceDeleted: (serviceId: string) => void;
  onCopyRowWhatsapp?: (service: ServiceGridRow) => void;
}

// Varsayılan durum filtresi - Randevulu ve Devam Eden işler öncelikli
// Not: Kullanıcı "Tüm İşler" preset'ini seçerek tüm aktif işlere erişebilir
export const DEFAULT_STATUS_FILTERS = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
] as const;

// Tüm aktif durumlar (Tüm İşler preset'i için)
export const ALL_ACTIVE_STATUS_FILTERS = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
] as const;

export const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RANDEVU_VERILDI', label: 'Randevu Verildi' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor' },
  { value: 'PARCA_BEKLIYOR', label: 'Parça Bekliyor' },
  { value: 'MUSTERI_ONAY_BEKLIYOR', label: 'Müşteri Onay Bekliyor' },
  { value: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor' },
  { value: 'IPTAL', label: 'İptal' },
  { value: 'ERTELENDI', label: 'Ertelendi' },
];

export const LOKASYON_FILTER_OPTIONS: Array<{ value: LokasyonGroup; label: string }> = [
  { value: 'YATMARIN', label: 'Yatmarin' },
  { value: 'NETSEL', label: 'Netsel' },
  { value: 'DIS_SERVIS', label: 'Dış Servis' },
];

export const BOARD_STATUS_ORDER = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
  'ERTELENDI',
  'IPTAL',
] as const;

export const ACTIVE_STATUS_VALUES = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
] as const;

export const QUEUE_FILTER_OPTIONS: Array<{ value: QueueFilter; label: string }> = [
  { value: 'ALL', label: 'Tüm İşler' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'OVERDUE', label: 'Geciken' },
  { value: 'UNASSIGNED', label: 'Atanmamış' },
  { value: 'UNSCHEDULED', label: 'Tarihsiz' },
  { value: 'WAITING', label: 'Bekleyen' },
];

export const SERVICE_VIEW_PRESET_OPTIONS: Array<{ value: ServiceViewPreset; label: string }> = [
  { value: 'DEFAULT', label: 'Varsayılan Operasyon' },
  { value: 'TODAY_ACTIVE', label: 'Bugün + Aktif' },
  { value: 'OVERDUE', label: 'Geciken Takibi' },
  { value: 'UNASSIGNED', label: 'Atama Bekleyenler' },
  { value: 'UNSCHEDULED', label: 'Tarihsiz İşler' },
  { value: 'WAITING', label: 'Bekleyen İşler' },
];
