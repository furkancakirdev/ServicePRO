import type { ServisDurumu } from '@prisma/client';
import { normalizeLokasyonText, normalizeServisDurumuForApp, getLokasyonGroupFromFields } from '@/lib/domain-mappers';
import { parseDateOnlyToUtcDate, toDateOnlyISO } from '@/lib/date-utils';
import type { OperationsOverviewDto, StatusCanonical } from './types';

const CLOSED_STATUSES = new Set<StatusCanonical>(['TAMAMLANDI', 'IPTAL', 'ERTELENDI']);

type OverviewInputService = {
  tarih: Date | string | null;
  tekneAdi: string;
  adres: string | null;
  yer: string | null;
  durum: ServisDurumu | string;
};

export function getCurrentWeekRangeUtc(today = new Date()): { start: Date; end: Date } {
  const utcMidday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0));
  const day = utcMidday.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(utcMidday);
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(12, 0, 0, 0);
  return { start, end };
}

function dayDiffInclusive(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
}

function toCanonicalStatus(value: ServisDurumu | string): StatusCanonical {
  const normalized = normalizeServisDurumuForApp(String(value || 'RANDEVU_VERILDI'));
  return normalized as StatusCanonical;
}

function formatRangeLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function normalizeDestination(yer: string | null, adres: string | null): string {
  const preferred = normalizeLokasyonText(yer);
  if (preferred) return preferred;
  return normalizeLokasyonText(adres) || 'Belirtilmedi';
}

export function buildOperationsOverview(params: {
  services: OverviewInputService[];
  activeTechnicianCount: number;
  start: Date;
  end: Date;
}): OperationsOverviewDto {
  const { services, activeTechnicianCount, start, end } = params;

  const mapped = services.map((service) => {
    const canonicalStatus = toCanonicalStatus(service.durum);
    const isOpen = !CLOSED_STATUSES.has(canonicalStatus);
    const date = parseDateOnlyToUtcDate(service.tarih);
    const dateKey = toDateOnlyISO(date);
    const inRange = Boolean(date && date >= start && date <= end);
    const locationGroup = getLokasyonGroupFromFields(service.yer, service.adres);
    return {
      ...service,
      canonicalStatus,
      isOpen,
      date,
      dateKey,
      inRange,
      locationGroup,
      destination: normalizeDestination(service.yer, service.adres),
    };
  });

  const openServices = mapped.filter((service) => service.isOpen);
  const openInRange = openServices.filter((service) => service.inRange);
  const unscheduledOpen = openServices.filter((service) => !service.date);
  const externalInRange = openInRange.filter((service) => service.locationGroup === 'DIS_SERVIS');

  const totalDays = dayDiffInclusive(start, end);
  const dailyLoad = Array.from({ length: totalDays }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    const rows = openInRange.filter((service) => service.dateKey === date);
    const uniqueBoats = new Set(rows.map((service) => service.tekneAdi).filter(Boolean));
    return {
      date,
      dayLabel: new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(day),
      total: rows.length,
      yatmarin: rows.filter((service) => service.locationGroup === 'YATMARIN').length,
      netsel: rows.filter((service) => service.locationGroup === 'NETSEL').length,
      disServis: rows.filter((service) => service.locationGroup === 'DIS_SERVIS').length,
      boatCount: uniqueBoats.size,
    };
  });

  const yatmarinByDay = dailyLoad.map((day) => ({
    date: day.date,
    dayLabel: day.dayLabel,
    serviceCount: day.yatmarin,
    boatCount: openInRange.filter((service) => service.dateKey === day.date && service.locationGroup === 'YATMARIN')
      .reduce((set, service) => set.add(service.tekneAdi), new Set<string>()).size,
  }));

  const externalDestinationMap = new Map<string, { serviceCount: number; boats: Set<string> }>();
  for (const service of externalInRange) {
    const key = service.destination;
    const existing = externalDestinationMap.get(key) ?? { serviceCount: 0, boats: new Set<string>() };
    existing.serviceCount += 1;
    if (service.tekneAdi) existing.boats.add(service.tekneAdi);
    externalDestinationMap.set(key, existing);
  }
  const externalDestinations = Array.from(externalDestinationMap.entries())
    .map(([destination, value]) => ({
      destination,
      serviceCount: value.serviceCount,
      boatCount: value.boats.size,
    }))
    .sort((left, right) => right.serviceCount - left.serviceCount);

  const unscheduledByStatusMap = new Map<StatusCanonical, number>();
  for (const service of unscheduledOpen) {
    unscheduledByStatusMap.set(service.canonicalStatus, (unscheduledByStatusMap.get(service.canonicalStatus) ?? 0) + 1);
  }
  const unscheduledByStatus = Array.from(unscheduledByStatusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count);

  const locationBreakdownMap = new Map<'YATMARIN' | 'NETSEL' | 'DIS_SERVIS', number>([
    ['YATMARIN', 0],
    ['NETSEL', 0],
    ['DIS_SERVIS', 0],
  ]);
  for (const service of openInRange) {
    locationBreakdownMap.set(service.locationGroup, (locationBreakdownMap.get(service.locationGroup) ?? 0) + 1);
  }
  const locationBreakdown = Array.from(locationBreakdownMap.entries()).map(([group, count]) => ({
    group,
    count,
  }));

  const weeklyCapacity = Math.max(0, activeTechnicianCount) * 5;
  const plannedInRange = openInRange.length;
  const utilizationPct = weeklyCapacity > 0 ? Math.min(100, Math.round((plannedInRange / weeklyCapacity) * 100)) : 0;

  return {
    range: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      label: formatRangeLabel(start, end),
    },
    totals: {
      allServices: mapped.length,
      openServices: openServices.length,
      scheduledInRange: openInRange.length,
      unscheduledOpen: unscheduledOpen.length,
      externalInRange: externalInRange.length,
    },
    capacity: {
      activeTechnicianCount,
      weeklyCapacity,
      plannedInRange,
      utilizationPct,
    },
    dailyLoad,
    yatmarinByDay,
    externalDestinations,
    unscheduledByStatus,
    locationBreakdown,
  };
}

