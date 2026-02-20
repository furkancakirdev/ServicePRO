import { IsTuru, ServisDurumu } from '@prisma/client';
import { normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';

export interface DashboardStats {
  // Today
  bugunRandevulu: number;
  bugunDevamEden: number;
  bugunTamamlanan: number;
  bugunToplamOperasyon: number;

  // Pipeline
  aktifServisler: number;
  devamEden: number;
  parcaBekleyen: number;
  onayBekleyen: number;
  raporBekleyen: number;
  gecikenServisler: number;
  acilServisler: number;

  // Capacity
  toplamTekne: number;
  toplamPersonel: number;
  aktifTeknisyen: number;
  thisWeekCompleted: number;
  unscheduledActive: number;
  waitingAgingDays: number;
  locationWorkload: Array<{ adres: string; count: number }>;
  statusTransitionFunnel: StatusTransitionFunnel;
  unscheduledTrend: Array<{ date: string; count: number }>;
  personnelWorkload: PersonnelWorkloadItem[];
  syncHealth: {
    latestStatus: string | null;
    lastSuccessfulAt: string | null;
    ageMinutes: number | null;
    stale: boolean;
  };

  // Detail lists
  bugununOperasyonlari: TodayOperation[];
  teknisyenDurumu: TechnicianStatus[];
  durumDagilimi: Array<{ durum: ServisDurumu; count: number }>;
  proaktifBakimUyarilari: ProactiveMaintenanceAlert[];
}

export interface TodayOperation {
  id: string;
  tekneAdi: string;
  tarih: string | null;
  saat: string | null;
  yer: string;
  durum: ServisDurumu;
  isTuru: string;
  personelSayisi: number;
}

export interface TechnicianStatus {
  id: string;
  ad: string;
  unvan: string;
  aktifServisSayisi: number;
  bosMu: boolean;
}

export interface StatusTransitionFunnel {
  planned: number;
  active: number;
  waiting: number;
  completedThisWeek: number;
}

export interface PersonnelWorkloadItem {
  id: string;
  ad: string;
  unvan: string;
  aktifServisSayisi: number;
  capacityStatus: 'LOW' | 'NORMAL' | 'HIGH';
}

export type ProactiveMaintenanceAlertLevel = 'GECIKTI' | 'YAKLASIYOR' | 'PLANLI';

export interface ProactiveMaintenanceAlert {
  id: string;
  tekneId: string;
  tekneAdi: string;
  arizaTipi: string;
  sonServisTarihi: string;
  sonrakiBakimTarihi: string;
  gunFarki: number;
  seviye: ProactiveMaintenanceAlertLevel;
  tekrarSayisi: number;
  ortalamaAralikGun: number;
  oneri: string;
}

const STATUS_VALUES = new Set(Object.values(ServisDurumu));
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
const ALERT_LOOKBACK_DAYS = 720;
const ALERT_WINDOW_DAYS = 45;
const MAX_ALERT_COUNT = 6;

const ARIZA_TYPE_PATTERNS: Array<{
  label: string;
  defaultIntervalDays: number;
  keywords: string[];
}> = [
  {
    label: 'Motor - sogutma',
    defaultIntervalDays: 90,
    keywords: ['motor', 'sogutma', 'hararet', 'impeller', 'pompa', 'termostat'],
  },
  {
    label: 'Elektrik - aku',
    defaultIntervalDays: 120,
    keywords: ['aku', 'elektrik', 'sarj', 'sigorta', 'kablo', 'alternator'],
  },
  {
    label: 'Yakit sistemi',
    defaultIntervalDays: 120,
    keywords: ['yakit', 'filtre', 'enjeksiyon', 'enjektor'],
  },
  {
    label: 'Yuruyen aksam',
    defaultIntervalDays: 150,
    keywords: ['pervane', 'sanziman', 'aks', 'trim', 'mil'],
  },
  {
    label: 'Govde - donanim',
    defaultIntervalDays: 180,
    keywords: ['govde', 'cam', 'kaporta', 'fitil', 'kapak'],
  },
];

function toDbStatus(candidate: string, fallback: ServisDurumu): ServisDurumu {
  const normalized = normalizeServisDurumuForDb(candidate);
  if (STATUS_VALUES.has(normalized as ServisDurumu)) {
    return normalized as ServisDurumu;
  }
  const matched = Object.values(ServisDurumu).find(
    (status) => normalizeServisDurumuForDb(status) === normalized
  );
  if (matched) {
    return matched;
  }
  return fallback;
}

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() + days);
  return value;
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const base = startOfDay(date);
  const dayOfWeek = base.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = addDays(base, mondayOffset);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getDayDiff(from: Date, to: Date): number {
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / MILLISECONDS_IN_DAY);
}

function normalizeTextForMatch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}

function getDefaultIntervalDays(isTuru: IsTuru): number {
  if (isTuru === 'PAKET') return 180;
  if (isTuru === 'PROJE') return 240;
  return 120;
}

function detectArizaTipi(
  isTuru: IsTuru,
  servisAciklamasi: string | null
): { arizaTipi: string; defaultIntervalDays: number } {
  if (isTuru === 'PAKET') {
    return { arizaTipi: 'Periyodik bakim', defaultIntervalDays: 180 };
  }

  if (isTuru === 'PROJE') {
    return { arizaTipi: 'Proje sonrasi kontrol', defaultIntervalDays: 240 };
  }

  const normalizedDescription = normalizeTextForMatch(servisAciklamasi ?? '');

  for (const pattern of ARIZA_TYPE_PATTERNS) {
    if (pattern.keywords.some((keyword) => normalizedDescription.includes(keyword))) {
      return {
        arizaTipi: pattern.label,
        defaultIntervalDays: pattern.defaultIntervalDays,
      };
    }
  }

  return {
    arizaTipi: 'Genel ariza kontrolu',
    defaultIntervalDays: getDefaultIntervalDays(isTuru),
  };
}

function calculateExpectedIntervalDays(historyDates: Date[], fallbackDays: number): number {
  if (historyDates.length < 2) {
    return fallbackDays;
  }

  const diffs: number[] = [];
  for (let index = 0; index < historyDates.length - 1; index += 1) {
    const diffDays = getDayDiff(historyDates[index + 1], historyDates[index]);
    if (diffDays >= 14 && diffDays <= 540) {
      diffs.push(diffDays);
    }
  }

  if (diffs.length === 0) {
    return fallbackDays;
  }

  const average = Math.round(diffs.reduce((total, value) => total + value, 0) / diffs.length);
  return Math.max(30, Math.min(365, average));
}

function createMaintenanceRecommendation(level: ProactiveMaintenanceAlertLevel, gunFarki: number): string {
  if (level === 'GECIKTI') {
    return `${Math.abs(gunFarki)} gun gecikti. Uygun ilk slota bakim planlayin.`;
  }

  if (level === 'YAKLASIYOR') {
    return `${gunFarki} gun icinde bakim zamani geliyor. Takvime simdiden randevu ekleyin.`;
  }

  return `${gunFarki} gun sonra kontrol zamani. Is yogunluguna gore planlayin.`;
}

function buildProactiveMaintenanceAlerts(
  historyRows: Array<{
    tekneId: string;
    tekneAdi: string;
    tarih: Date | null;
    isTuru: IsTuru;
    servisAciklamasi: string;
  }>,
  todayStart: Date
): ProactiveMaintenanceAlert[] {
  const groups = new Map<
    string,
    {
      tekneId: string;
      tekneAdi: string;
      arizaTipi: string;
      defaultIntervalDays: number;
      tarihListesi: Date[];
    }
  >();

  for (const row of historyRows) {
    if (!row.tarih) continue;

    const tip = detectArizaTipi(row.isTuru, row.servisAciklamasi);
    const key = `${row.tekneId}::${tip.arizaTipi}`;
    const entry = groups.get(key);

    if (!entry) {
      groups.set(key, {
        tekneId: row.tekneId,
        tekneAdi: row.tekneAdi,
        arizaTipi: tip.arizaTipi,
        defaultIntervalDays: tip.defaultIntervalDays,
        tarihListesi: [startOfDay(row.tarih)],
      });
      continue;
    }

    entry.tarihListesi.push(startOfDay(row.tarih));
  }

  const alerts: ProactiveMaintenanceAlert[] = [];

  for (const group of Array.from(groups.values())) {
    if (group.tarihListesi.length === 0) continue;

    const sortedDates = [...group.tarihListesi].sort((left, right) => right.getTime() - left.getTime());
    const ortalamaAralikGun = calculateExpectedIntervalDays(sortedDates, group.defaultIntervalDays);
    const sonServisTarihi = sortedDates[0];
    const sonrakiBakimTarihi = addDays(sonServisTarihi, ortalamaAralikGun);
    const gunFarki = getDayDiff(todayStart, sonrakiBakimTarihi);

    if (gunFarki > ALERT_WINDOW_DAYS) {
      continue;
    }

    const seviye: ProactiveMaintenanceAlertLevel =
      gunFarki < 0 ? 'GECIKTI' : gunFarki <= 14 ? 'YAKLASIYOR' : 'PLANLI';

    alerts.push({
      id: `${group.tekneId}-${group.arizaTipi}`,
      tekneId: group.tekneId,
      tekneAdi: group.tekneAdi,
      arizaTipi: group.arizaTipi,
      sonServisTarihi: sonServisTarihi.toISOString(),
      sonrakiBakimTarihi: sonrakiBakimTarihi.toISOString(),
      gunFarki,
      seviye,
      tekrarSayisi: sortedDates.length,
      ortalamaAralikGun,
      oneri: createMaintenanceRecommendation(seviye, gunFarki),
    });
  }

  const levelPriority: Record<ProactiveMaintenanceAlertLevel, number> = {
    GECIKTI: 0,
    YAKLASIYOR: 1,
    PLANLI: 2,
  };

  return alerts
    .sort((left, right) => {
      const levelDiff = levelPriority[left.seviye] - levelPriority[right.seviye];
      if (levelDiff !== 0) return levelDiff;
      if (left.gunFarki !== right.gunFarki) return left.gunFarki - right.gunFarki;
      return right.tekrarSayisi - left.tekrarSayisi;
    })
    .slice(0, MAX_ALERT_COUNT);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = startOfDay(new Date());
  const thisWeek = getWeekRange(todayStart);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const alertLookbackStart = addDays(todayStart, -ALERT_LOOKBACK_DAYS);

  const inProgressStatus = toDbStatus('DEVAM_EDIYOR', ServisDurumu.RANDEVU_VERILDI);
  const plannedStatus = toDbStatus('RANDEVU_VERILDI', ServisDurumu.RANDEVU_VERILDI);
  const partsWaitingStatus = toDbStatus('PARCA_BEKLIYOR', ServisDurumu.PARCA_BEKLIYOR);
  const approvalWaitingStatus = toDbStatus('MUSTERI_ONAY_BEKLIYOR', ServisDurumu.MUSTERI_ONAY_BEKLIYOR);
  const reportWaitingStatus = toDbStatus('RAPOR_BEKLIYOR', ServisDurumu.RAPOR_BEKLIYOR);
  const inspectionStatus = toDbStatus('KESIF_KONTROL', ServisDurumu.KESIF_KONTROL);
  const completedStatus = toDbStatus('TAMAMLANDI', ServisDurumu.TAMAMLANDI);
  const cancelledStatus = toDbStatus('IPTAL', ServisDurumu.IPTAL);
  const deferredStatus = toDbStatus('ERTELENDI', ServisDurumu.ERTELENDI);

  const activeStatuses: ServisDurumu[] = [
    plannedStatus,
    inProgressStatus,
    partsWaitingStatus,
    approvalWaitingStatus,
    reportWaitingStatus,
    inspectionStatus,
  ];

  const [
    bugunRandevulu,
    bugunDevamEden,
    bugunTamamlanan,
    thisWeekCompleted,
    bugunToplamOperasyon,
    aktifServisler,
    devamEden,
    parcaBekleyen,
    onayBekleyen,
    raporBekleyen,
    unscheduledActive,
    gecikenServisler,
    toplamTekne,
    toplamPersonel,
    bugununOperasyonlari,
    personelAtamalari,
    durumDagilimiRaw,
    bakimGecmisi,
    waitingOldestRecord,
    locationWorkloadRaw,
    unscheduledTrendRows,
    latestSyncLog,
    latestSyncSuccessLog,
  ] = await Promise.all([
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { gte: todayStart, lte: todayEnd },
        durum: plannedStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { gte: todayStart, lte: todayEnd },
        durum: inProgressStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { gte: todayStart, lte: todayEnd },
        durum: completedStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: completedStatus,
        tarih: { gte: thisWeek.start, lte: thisWeek.end },
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { gte: todayStart, lte: todayEnd },
        durum: { notIn: [cancelledStatus] },
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: { in: activeStatuses },
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: inProgressStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: partsWaitingStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: approvalWaitingStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: reportWaitingStatus,
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: null,
        durum: { in: activeStatuses },
      },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        tarih: { lt: todayStart },
        durum: { in: activeStatuses },
      },
    }),
    prisma.tekne.count({
      where: {
        deletedAt: null,
        aktif: true,
      },
    }),
    prisma.personel.count({
      where: {
        deletedAt: null,
        aktif: true,
      },
    }),
    prisma.service.findMany({
      where: {
        deletedAt: null,
        tarih: { gte: todayStart, lte: todayEnd },
        durum: { notIn: [cancelledStatus, deferredStatus] },
      },
      select: {
        id: true,
        tekneAdi: true,
        tarih: true,
        saat: true,
        yer: true,
        durum: true,
        isTuru: true,
        _count: {
          select: {
            personeller: true,
          },
        },
      },
      orderBy: [{ saat: 'asc' }, { createdAt: 'asc' }],
      take: 8,
    }),
    prisma.servicePersonel.groupBy({
      by: ['personelId'],
      where: {
        servis: {
          deletedAt: null,
          durum: { in: activeStatuses },
        },
      },
      _count: {
        personelId: true,
      },
    }),
    prisma.service.groupBy({
      by: ['durum'],
      where: {
        deletedAt: null,
      },
      _count: {
        durum: true,
      },
    }),
    prisma.service.findMany({
      where: {
        deletedAt: null,
        durum: completedStatus,
        tarih: {
          not: null,
          gte: alertLookbackStart,
        },
      },
      select: {
        tekneId: true,
        tekneAdi: true,
        tarih: true,
        isTuru: true,
        servisAciklamasi: true,
      },
      orderBy: [{ tekneId: 'asc' }, { tarih: 'desc' }],
      take: 5000,
    }),
    prisma.service.findFirst({
      where: {
        deletedAt: null,
        durum: { in: [partsWaitingStatus, approvalWaitingStatus] },
      },
      select: { createdAt: true, tarih: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.service.groupBy({
      by: ['adres'],
      where: {
        deletedAt: null,
        durum: { in: activeStatuses },
      },
      _count: { _all: true },
    }),
    prisma.service.findMany({
      where: {
        deletedAt: null,
        tarih: null,
        createdAt: {
          gte: addDays(todayStart, -6),
        },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.syncLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { status: true, createdAt: true },
    }),
    prisma.syncLog.findFirst({
      where: { status: { in: ['SUCCESS', 'PARTIAL'] } },
      orderBy: { createdAt: 'desc' },
      select: { status: true, createdAt: true },
    }),
  ]);

  const personel = await prisma.personel.findMany({
    where: {
      deletedAt: null,
      aktif: true,
    },
    select: {
      id: true,
      ad: true,
      unvan: true,
    },
  });

  const personelServisSayisi = new Map(
    personelAtamalari.map((item) => [item.personelId, item._count.personelId])
  );

  const teknisyenDurumu: TechnicianStatus[] = personel.map((item) => ({
    id: item.id,
    ad: item.ad,
    unvan: item.unvan,
    aktifServisSayisi: personelServisSayisi.get(item.id) || 0,
    bosMu: (personelServisSayisi.get(item.id) || 0) === 0,
  }));

  const bugununOperasyonlariFormatted: TodayOperation[] = bugununOperasyonlari.map((item) => ({
    id: item.id,
    tekneAdi: item.tekneAdi,
    tarih: item.tarih?.toISOString() || null,
    saat: item.saat,
    yer: item.yer,
    durum: item.durum,
    isTuru: item.isTuru,
    personelSayisi: item._count.personeller,
  }));

  const durumDagilimi = durumDagilimiRaw.map((item) => ({
    durum: item.durum,
    count: item._count.durum,
  }));
  const proaktifBakimUyarilari = buildProactiveMaintenanceAlerts(bakimGecmisi, todayStart);
  const waitingReferenceDate = waitingOldestRecord?.tarih ?? waitingOldestRecord?.createdAt ?? null;
  const waitingAgingDays = waitingReferenceDate ? getDayDiff(waitingReferenceDate, todayStart) : 0;
  const locationWorkload = locationWorkloadRaw
    .map((item) => ({
      adres: item.adres || 'Bilinmeyen',
      count: item._count._all,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
  const syncReference = latestSyncSuccessLog?.createdAt ?? latestSyncLog?.createdAt ?? null;
  const syncAgeMinutes =
    syncReference !== null
      ? Math.floor((Date.now() - new Date(syncReference).getTime()) / (1000 * 60))
      : null;
  const syncHealth = {
    latestStatus: latestSyncLog?.status ?? null,
    lastSuccessfulAt: latestSyncSuccessLog?.createdAt?.toISOString() ?? null,
    ageMinutes: syncAgeMinutes,
    stale: syncAgeMinutes === null ? true : syncAgeMinutes > 10,
  };
  const durumCountMap = new Map(
    durumDagilimiRaw.map((item) => [item.durum, item._count.durum] as const)
  );
  const statusTransitionFunnel: StatusTransitionFunnel = {
    planned: durumCountMap.get(plannedStatus) ?? 0,
    active: durumCountMap.get(inProgressStatus) ?? 0,
    waiting:
      (durumCountMap.get(partsWaitingStatus) ?? 0) +
      (durumCountMap.get(approvalWaitingStatus) ?? 0) +
      (durumCountMap.get(reportWaitingStatus) ?? 0),
    completedThisWeek: thisWeekCompleted,
  };

  const trendMap = new Map<string, number>();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = addDays(todayStart, -offset);
    trendMap.set(day.toISOString().slice(0, 10), 0);
  }
  for (const row of unscheduledTrendRows) {
    const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
    if (!trendMap.has(key)) continue;
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }
  const unscheduledTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

  const personnelWorkload: PersonnelWorkloadItem[] = teknisyenDurumu
    .map((person) => {
      let capacityStatus: PersonnelWorkloadItem['capacityStatus'] = 'NORMAL';
      if (person.aktifServisSayisi >= 4) capacityStatus = 'HIGH';
      else if (person.aktifServisSayisi === 0) capacityStatus = 'LOW';

      return {
        id: person.id,
        ad: person.ad,
        unvan: person.unvan,
        aktifServisSayisi: person.aktifServisSayisi,
        capacityStatus,
      };
    })
    .sort((left, right) => right.aktifServisSayisi - left.aktifServisSayisi)
    .slice(0, 8);

  return {
    bugunRandevulu,
    bugunDevamEden,
    bugunTamamlanan,
    thisWeekCompleted,
    bugunToplamOperasyon,
    aktifServisler,
    devamEden,
    parcaBekleyen,
    onayBekleyen,
    raporBekleyen,
    unscheduledActive,
    waitingAgingDays,
    locationWorkload,
    statusTransitionFunnel,
    unscheduledTrend,
    personnelWorkload,
    syncHealth,
    gecikenServisler,
    acilServisler: gecikenServisler,
    toplamTekne,
    toplamPersonel,
    aktifTeknisyen: teknisyenDurumu.filter((item) => !item.bosMu).length,
    bugununOperasyonlari: bugununOperasyonlariFormatted,
    teknisyenDurumu,
    durumDagilimi,
    proaktifBakimUyarilari,
  };
}
