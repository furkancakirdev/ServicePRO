export type LokasyonGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

export type DataGridViewMode = 'list' | 'board';

export type DataGridGroupBy = 'none' | 'tekneAdi' | 'lokasyonGroup';

export type QueueFilter = 'ALL' | 'ACTIVE' | 'OVERDUE' | 'UNASSIGNED' | 'COMPLETED' | 'UNSCHEDULED';

export type ServiceViewPreset =
  | 'DEFAULT'
  | 'TODAY_ACTIVE'
  | 'OVERDUE'
  | 'UNASSIGNED'
  | 'COMPLETED'
  | 'FIELD_BOARD';

export interface ServiceGridRow {
  id: string;
  tarih: string | null;
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
}

export const DEFAULT_STATUS_FILTERS = ['RANDEVU_VERILDI', 'DEVAM_EDIYOR'] as const;

export const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RANDEVU_VERILDI', label: 'Randevu Verildi' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor' },
  { value: 'PARCA_BEKLIYOR', label: 'Parça Bekliyor' },
  { value: 'MUSTERI_ONAY_BEKLIYOR', label: 'Müşteri Onay Bekliyor' },
  { value: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor' },
  { value: 'KESIF_KONTROL', label: 'Keşif Kontrol' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
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
  'KESIF_KONTROL',
  'TAMAMLANDI',
  'ERTELENDI',
  'IPTAL',
] as const;

export const ACTIVE_STATUS_VALUES = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
  'KESIF_KONTROL',
] as const;

export const QUEUE_FILTER_OPTIONS: Array<{ value: QueueFilter; label: string }> = [
  { value: 'ALL', label: 'Tum Isler' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'OVERDUE', label: 'Geciken' },
  { value: 'UNASSIGNED', label: 'Atanmamis' },
  { value: 'UNSCHEDULED', label: 'Tarihsiz' },
  { value: 'COMPLETED', label: 'Tamamlanan' },
];

export const SERVICE_VIEW_PRESET_OPTIONS: Array<{ value: ServiceViewPreset; label: string }> = [
  { value: 'DEFAULT', label: 'Varsayilan Operasyon' },
  { value: 'TODAY_ACTIVE', label: 'Bugun + Aktif' },
  { value: 'OVERDUE', label: 'Geciken Takibi' },
  { value: 'UNASSIGNED', label: 'Atama Bekleyenler' },
  { value: 'COMPLETED', label: 'Tamamlanan Arsiv' },
  { value: 'FIELD_BOARD', label: 'Dis Servis Board' },
];
