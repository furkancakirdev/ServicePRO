export type LokasyonGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';
export type PriorityLevel = 'YUKSEK' | 'ORTA' | 'DUSUK';

export type DataGridViewMode = 'list';

export type DataGridGroupBy = 'none' | 'tekneAdi' | 'lokasyonGroup';

export type QueueFilter = 'ALL' | 'ACTIVE' | 'OVERDUE' | 'UNASSIGNED' | 'UNSCHEDULED' | 'WAITING';

export type ServiceViewPreset =
  | 'DEFAULT'
  | 'TODAY_TO_PLAN'
  | 'BLOCKED'
  | 'APPROVAL_PENDING'
  | 'PARTS_PENDING';

export type ServiceStatusOption = { value: string; label: string };
export type ServiceLocationOption = { value: string; label: string };

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
  oncelik: PriorityLevel;
  blokajNedeni: string | null;
  atananTeknisyenler: string[];
  personelSayisi: number;
  isTuru: string;
  createdAt: string;
}

export interface ServiceGridInitialState {
  search: string;
  statuses: string[];
  lokasyonGroups: string[];
  dateKeys: string[];
  queueFilter: QueueFilter;
  viewMode: DataGridViewMode;
  groupBy: DataGridGroupBy;
  dateFrom: string;
  dateTo: string;
  technicians: string[];
  priorities: PriorityLevel[];
  blockingReasons: string[];
}

export interface ServiceGridServerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ServiceTableMeta {
  onServiceStatusChange: (
    serviceId: string,
    nextStatus: string
  ) => Promise<void>;
  isServiceStatusUpdating: (serviceId: string) => boolean;
  onServiceDeleted: (serviceId: string) => void;
  onCopyRowWhatsapp?: (service: ServiceGridRow) => void;
  statusOptions?: ServiceStatusOption[];
  locationOptions?: ServiceLocationOption[];
}

export const DEFAULT_STATUS_FILTERS = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
] as const;

export const ALL_ACTIVE_STATUS_FILTERS = [
  'RANDEVU_VERILDI',
  'DEVAM_EDIYOR',
  'PARCA_BEKLIYOR',
  'MUSTERI_ONAY_BEKLIYOR',
  'RAPOR_BEKLIYOR',
] as const;

export const STATUS_FILTER_OPTIONS: ServiceStatusOption[] = [
  { value: 'RANDEVU_VERILDI', label: 'Randevu Verildi' },
  { value: 'DEVAM_EDIYOR', label: 'Devam Ediyor' },
  { value: 'PARCA_BEKLIYOR', label: 'Parca Bekliyor' },
  { value: 'MUSTERI_ONAY_BEKLIYOR', label: 'Onay Bekliyor' },
  { value: 'RAPOR_BEKLIYOR', label: 'Rapor Bekliyor' },
  { value: 'IPTAL', label: 'Iptal' },
  { value: 'ERTELENDI', label: 'Ertelendi' },
];

export const LOKASYON_FILTER_OPTIONS: ServiceLocationOption[] = [
  { value: 'YATMARIN', label: 'Yatmarin' },
  { value: 'NETSEL', label: 'Netsel' },
  { value: 'DIS_SERVIS', label: 'Dis Servis' },
];

export const PRIORITY_FILTER_OPTIONS: Array<{ value: PriorityLevel; label: string }> = [
  { value: 'YUKSEK', label: 'Yuksek' },
  { value: 'ORTA', label: 'Orta' },
  { value: 'DUSUK', label: 'Dusuk' },
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
  { value: 'ALL', label: 'Tum Isler' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'OVERDUE', label: 'Geciken' },
  { value: 'UNASSIGNED', label: 'Atanmamis' },
  { value: 'UNSCHEDULED', label: 'Tarihsiz' },
  { value: 'WAITING', label: 'Bekleyen' },
];

export const SERVICE_VIEW_PRESET_OPTIONS: Array<{ value: ServiceViewPreset; label: string }> = [
  { value: 'DEFAULT', label: 'Varsayilan Operasyon' },
  { value: 'TODAY_TO_PLAN', label: 'Bugun Planlanacak' },
  { value: 'BLOCKED', label: 'Blokajli' },
  { value: 'APPROVAL_PENDING', label: 'Onay Bekleyen' },
  { value: 'PARTS_PENDING', label: 'Parca Bekleyen' },
];
