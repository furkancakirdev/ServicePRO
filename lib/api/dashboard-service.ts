import { ServisDurumu } from '@prisma/client';
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

  // Detail lists
  bugununOperasyonlari: TodayOperation[];
  teknisyenDurumu: TechnicianStatus[];
  durumDagilimi: Array<{ durum: ServisDurumu; count: number }>;
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

const STATUS_VALUES = new Set(Object.values(ServisDurumu));

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

export async function getDashboardStats(): Promise<DashboardStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

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
    bugunToplamOperasyon,
    aktifServisler,
    devamEden,
    parcaBekleyen,
    onayBekleyen,
    raporBekleyen,
    gecikenServisler,
    toplamTekne,
    toplamPersonel,
    bugununOperasyonlari,
    personelAtamalari,
    durumDagilimiRaw,
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

  return {
    bugunRandevulu,
    bugunDevamEden,
    bugunTamamlanan,
    bugunToplamOperasyon,
    aktifServisler,
    devamEden,
    parcaBekleyen,
    onayBekleyen,
    raporBekleyen,
    gecikenServisler,
    acilServisler: gecikenServisler,
    toplamTekne,
    toplamPersonel,
    aktifTeknisyen: teknisyenDurumu.filter((item) => !item.bosMu).length,
    bugununOperasyonlari: bugununOperasyonlariFormatted,
    teknisyenDurumu,
    durumDagilimi,
  };
}
