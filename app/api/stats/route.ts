// Dashboard Stats API

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ServisDurumu } from '@prisma/client';
import { normalizeServisDurumuForDb } from '@/lib/domain-mappers';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const devamEdiyorDurumu = (normalizeServisDurumuForDb('DEVAM_EDIYOR') ?? 'DEVAM_EDİYOR') as ServisDurumu;

    const [
      toplamServis,
      aktifServisler,
      tamamlananServisler,
      bekleyenServisler,
      bugunServisler,
      bugunRandevuluServisler,
      bugunDevamEdenServisler,
      bugunTamamlananServisler,
      bugunBekleyenServisler,
      teknelerSayisi,
      personelSayisi,
      durumDagilimi,
      isTuruDagilimi,
    ] = await Promise.all([
      prisma.service.count({ where: { deletedAt: null } }),
      prisma.service.count({
        where: {
          deletedAt: null,
          durum: { notIn: ['TAMAMLANDI', 'IPTAL', 'ERTELENDI'] },
        },
      }),
      prisma.service.count({ where: { deletedAt: null, durum: 'TAMAMLANDI' } }),
      prisma.service.count({
        where: {
          deletedAt: null,
          durum: { in: ['RANDEVU_VERILDI', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR', 'KESIF_KONTROL'] },
        },
      }),
      prisma.service.count({
        where: {
          deletedAt: null,
          tarih: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.service.count({
        where: {
          deletedAt: null,
          tarih: { gte: todayStart, lte: todayEnd },
          durum: 'RANDEVU_VERILDI',
        },
      }),
      prisma.service.count({
        where: {
          deletedAt: null,
          tarih: { gte: todayStart, lte: todayEnd },
          durum: devamEdiyorDurumu,
        },
      }),
      prisma.service.count({
        where: {
          deletedAt: null,
          tarih: { gte: todayStart, lte: todayEnd },
          durum: 'TAMAMLANDI',
        },
      }),
      prisma.service.count({
        where: {
          deletedAt: null,
          tarih: { gte: todayStart, lte: todayEnd },
          durum: { in: ['RANDEVU_VERILDI', 'PARCA_BEKLIYOR', 'MUSTERI_ONAY_BEKLIYOR', 'RAPOR_BEKLIYOR'] },
        },
      }),
      prisma.tekne.count({ where: { deletedAt: null, aktif: true } }),
      prisma.personel.count({ where: { deletedAt: null, aktif: true } }),
      prisma.service.groupBy({ by: ['durum'], where: { deletedAt: null }, _count: true }),
      prisma.service.groupBy({ by: ['isTuru'], where: { deletedAt: null }, _count: true }),
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last7Days = await prisma.service.findMany({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const gunlukTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];

      return {
        tarih: dateStr,
        sayi: last7Days.filter((s) => s.createdAt.toISOString().split('T')[0] === dateStr).length,
      };
    });

    const sonAktiviteler = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, ad: true, email: true } },
      },
    });

    return NextResponse.json({
      toplamServis,
      aktifServisler,
      tamamlananServisler,
      bekleyenServisler,
      toplamBekleyenServisler: bekleyenServisler,
      bugunServisler,
      bugunRandevuluServisler,
      bugunDevamEdenServisler,
      bugunTamamlananServisler,
      bugunBekleyenServisler,
      teknelerSayisi,
      personelSayisi,
      durumDagilimi: durumDagilimi.map((d) => ({ durum: d.durum, sayi: d._count })),
      isTuruDagilimi: isTuruDagilimi.map((d) => ({ isTuru: d.isTuru, sayi: d._count })),
      gunlukTrend,
      sonAktiviteler: sonAktiviteler.map((a) => ({
        id: a.id,
        islem: a.islemTuru,
        entity: a.entityTipi,
        userId: a.userId,
        userAd: a.user?.ad || 'Sistem',
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'İstatistikler getirilemedi' }, { status: 500 });
  }
}

