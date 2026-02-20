import type { ServisDurumu } from '@/types';
import { parseDateOnlyToUtcDate, toDateOnlyISO } from '@/lib/date-utils';
import { getLokasyonGroupFromFields } from '@/lib/domain-mappers';
import type { LocationGroup, ServiceApiItem } from './types';

export const CLOSED_STATUSES = new Set<ServisDurumu>(['TAMAMLANDI', 'IPTAL', 'ERTELENDI']);

export function locationGroupFrom(yer?: string | null, adres?: string | null): LocationGroup {
  return getLokasyonGroupFromFields(yer, adres);
}

export function startOfCurrentWeek(date = new Date()): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0));
  const day = start.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + offset);
  start.setUTCHours(12, 0, 0, 0);
  return start;
}

export function endOfWeekInclusive(startOfWeek: Date): Date {
  const end = new Date(startOfWeek);
  end.setUTCDate(startOfWeek.getUTCDate() + 6);
  end.setUTCHours(12, 0, 0, 0);
  return end;
}

export function formatDateLabel(value?: string | null): string {
  const parsed = parseDateOnlyToUtcDate(value ?? null);
  if (!parsed) return 'Tarihsiz';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function assignmentCount(service: ServiceApiItem): number {
  return service.personeller?.length ?? 0;
}

export function isInCurrentWeek(service: ServiceApiItem, weekStart: Date, weekEnd: Date): boolean {
  if (!service.tarih) return false;
  const date = parseDateOnlyToUtcDate(service.tarih);
  if (!date) return false;
  return date >= weekStart && date <= weekEnd;
}

export function isOverdue(service: ServiceApiItem): boolean {
  if (CLOSED_STATUSES.has(service.durum)) return false;
  const dueDateRaw = service.tahminiBitisTarihi ?? service.tarih ?? null;
  if (!dueDateRaw) return false;

  const scheduledDate = parseDateOnlyToUtcDate(dueDateRaw);
  if (!scheduledDate) return false;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  return scheduledDate.getTime() < todayUtc.getTime();
}

function priorityRank(service: ServiceApiItem): number {
  if (isOverdue(service)) return 0;
  if (!service.tarih) return 1;
  if (assignmentCount(service) === 0) return 2;
  return 3;
}

export function compareForPlanList(left: ServiceApiItem, right: ServiceApiItem): number {
  const leftRank = priorityRank(left);
  const rightRank = priorityRank(right);

  if (leftRank !== rightRank) return leftRank - rightRank;

  const leftDate = toDateOnlyISO(left.tarih) ?? '9999-12-31';
  const rightDate = toDateOnlyISO(right.tarih) ?? '9999-12-31';
  if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

  const leftTime = left.saat ?? '23:59';
  const rightTime = right.saat ?? '23:59';
  if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);

  return left.tekneAdi.localeCompare(right.tekneAdi, 'tr');
}
