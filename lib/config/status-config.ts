import { ServisDurumu } from '@prisma/client';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  calendarColorHex: string;
  icon: string;
  priority: number;
  transitions: ServisDurumu[];
}

export const STATUS_CONFIG: Record<ServisDurumu, StatusConfig> = {
  RANDEVU_VERILDI: {
    label: 'Randevu Verildi',
    color: 'text-sky-700 dark:text-sky-400',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    calendarColorHex: '#0ea5e9',
    icon: '📅',
    priority: 2,
    transitions: ['DEVAM_EDİYOR', 'IPTAL', 'ERTELENDI'],
  },
  'DEVAM_EDİYOR': {
    label: 'Devam Ediyor',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    calendarColorHex: '#22c55e',
    icon: '🔧',
    priority: 1,
    transitions: ['PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'TAMAMLANDI'],
  },
  PARCA_BEKLIYOR: {
    label: 'Parça Bekliyor',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    calendarColorHex: '#f97316',
    icon: '📦',
    priority: 3,
    transitions: ['DEVAM_EDİYOR', 'TAMAMLANDI', 'IPTAL'],
  },
  MUSTERI_ONAY_BEKLIYOR: {
    label: 'Müşteri Onay Bekliyor',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    calendarColorHex: '#f59e0b',
    icon: '👤',
    priority: 3,
    transitions: ['DEVAM_EDİYOR', 'TAMAMLANDI', 'IPTAL'],
  },
  RAPOR_BEKLIYOR: {
    label: 'Rapor Bekliyor',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    calendarColorHex: '#3b82f6',
    icon: '📄',
    priority: 2,
    transitions: ['TAMAMLANDI', 'IPTAL'],
  },
  KESIF_KONTROL: {
    label: 'Keşif / Kontrol',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    calendarColorHex: '#a855f7',
    icon: '🔍',
    priority: 2,
    transitions: ['RANDEVU_VERILDI', 'DEVAM_EDİYOR', 'TAMAMLANDI', 'IPTAL'],
  },
  TAMAMLANDI: {
    label: 'Tamamlandı',
    color: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    calendarColorHex: '#64748b',
    icon: '✅',
    priority: 4,
    transitions: [],
  },
  IPTAL: {
    label: 'İptal',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    calendarColorHex: '#ef4444',
    icon: '❌',
    priority: 5,
    transitions: [],
  },
  ERTELENDI: {
    label: 'Ertelendi',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    calendarColorHex: '#eab308',
    icon: '⏸️',
    priority: 4,
    transitions: ['RANDEVU_VERILDI', 'DEVAM_EDİYOR', 'IPTAL'],
  },
};

export const DURUM_CONFIG = STATUS_CONFIG;

function resolveStatusKey(status: ServisDurumu | string): ServisDurumu {
  const normalized = normalizeServisDurumuForApp(String(status || ''));
  if (normalized === 'DEVAM_EDIYOR') {
    return 'DEVAM_EDİYOR' as ServisDurumu;
  }

  return (normalized || 'TAMAMLANDI') as ServisDurumu;
}

export function getStatusConfig(status: ServisDurumu | string): StatusConfig {
  const key = resolveStatusKey(status);
  return STATUS_CONFIG[key] || STATUS_CONFIG.TAMAMLANDI;
}
