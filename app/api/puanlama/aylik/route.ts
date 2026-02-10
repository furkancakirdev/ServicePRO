import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getCurrentAy(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthRange(ay: string): { start: Date; end: Date } {
  const [year, month] = ay.split('-').map((v) => Number(v));
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

function parseWeight(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIsmailTo100(puan: number): number {
  const bounded = Math.min(5, Math.max(1, puan));
  return ((bounded - 1) / 4) * 100;
}

function computeTotal(params: {
  bireysel: number;
  yetkili: number | null;
  ismail: number | null;
  weights: { bireysel: number; yetkili: number; ismail: number };
}): number {
  const parts: Array<{ score: number; weight: number }> = [{ score: params.bireysel, weight: params.weights.bireysel }];

  if (params.yetkili !== null) {
    parts.push({ score: params.yetkili, weight: params.weights.yetkili });
  }

  if (params.ismail !== null) {
    parts.push({ score: normalizeIsmailTo100(params.ismail), weight: params.weights.ismail });
  }

  const totalWeight = parts.reduce((acc, p) => acc + p.weight, 0);
  if (totalWeight <= 0) return Math.round(params.bireysel);

  const weighted = parts.reduce((acc, p) => acc + p.score * p.weight, 0) / totalWeight;
  return Math.round(weighted);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const ay = searchParams.get('ay') || getCurrentAy();

    if (!/^\d{4}-\d{2}$/.test(ay)) {
      return NextResponse.json({ error: 'Geçersiz ay formatı. Beklenen: YYYY-MM' }, { status: 400 });
    }

    const { start, end } = getMonthRange(ay);

    const [personeller, servisGruplari, ustaDegerler, cirakDegerler, ismailDegerler, settings] = await Promise.all([
      prisma.personel.findMany({
        where: { deletedAt: null, aktif: true, rol: 'teknisyen' },
        select: { id: true, ad: true, unvan: true },
        orderBy: { ad: 'asc' },
      }),
      prisma.servisPuan.groupBy({
        by: ['personelId'],
        where: { createdAt: { gte: start, lt: end } },
        _count: { _all: true },
        _avg: { finalPuan: true },
      }),
      prisma.yetkiliDegerlendirmeUsta.findMany({
        where: { ay },
        select: { personnelId: true, toplamPuan: true },
      }),
      prisma.yetkiliDegerlendirmeCirak.findMany({
        where: { ay },
        select: { personnelId: true, toplamPuan: true },
      }),
      prisma.ismailDegerlendirme.findMany({
        where: { ay },
        select: { personnelId: true, puan: true },
      }),
      prisma.setting.findMany({
        where: {
          anahtar: {
            in: [
              'yetkili_puan_agirlik',
              'ismail_puan_agirlik',
              'yetkiliPuan_agirlik',
              'ismailPuan_agirlik',
            ],
          },
        },
        select: { anahtar: true, deger: true },
      }),
    ]);

    const settingMap = new Map(settings.map((s) => [s.anahtar, s.deger]));

    const yetkiliWeight = parseWeight(
      settingMap.get('yetkili_puan_agirlik') ?? settingMap.get('yetkiliPuan_agirlik'),
      35
    );
    const ismailWeight = parseWeight(
      settingMap.get('ismail_puan_agirlik') ?? settingMap.get('ismailPuan_agirlik'),
      25
    );
    const bireyselWeight = Math.max(0, 100 - yetkiliWeight - ismailWeight);

    const servisMap = new Map(
      servisGruplari.map((row) => [
        row.personelId,
        {
          servisSayisi: row._count._all,
          bireyselPuan: row._avg.finalPuan ? Math.round(row._avg.finalPuan) : 0,
        },
      ])
    );

    const yetkiliMap = new Map<string, number>();
    for (const row of ustaDegerler) {
      yetkiliMap.set(row.personnelId, Math.round(row.toplamPuan));
    }
    for (const row of cirakDegerler) {
      yetkiliMap.set(row.personnelId, Math.round(row.toplamPuan));
    }

    const ismailMap = new Map(ismailDegerler.map((row) => [row.personnelId, row.puan]));

    const baseRows = personeller.map((p) => {
      const servisData = servisMap.get(p.id) ?? { servisSayisi: 0, bireyselPuan: 0 };
      const yetkiliPuan = yetkiliMap.get(p.id) ?? null;
      const ismailPuani = ismailMap.get(p.id) ?? null;
      const agirlikliToplamPuan = computeTotal({
        bireysel: servisData.bireyselPuan,
        yetkili: yetkiliPuan,
        ismail: ismailPuani,
        weights: {
          bireysel: bireyselWeight,
          yetkili: yetkiliWeight,
          ismail: ismailWeight,
        },
      });

      return {
        personelId: p.id,
        personel: p.ad,
        unvan: p.unvan,
        servis: servisData.servisSayisi,
        bireyselPuan: servisData.bireyselPuan,
        yetkiliPuani: yetkiliPuan,
        ismailUstaPuani: ismailPuani,
        agirlikliToplamPuan,
        disPuanlarTamam: yetkiliPuan !== null && ismailPuani !== null,
      };
    });

    const tumDisPuanlarTamam = baseRows.every((row) => row.disPuanlarTamam);
    const rows = baseRows.map((row) => ({
      ...row,
      toplamPuan: tumDisPuanlarTamam ? row.agirlikliToplamPuan : row.bireyselPuan,
    }));

    rows.sort((a, b) => {
      if (b.toplamPuan !== a.toplamPuan) return b.toplamPuan - a.toplamPuan;
      if (b.bireyselPuan !== a.bireyselPuan) return b.bireyselPuan - a.bireyselPuan;
      return a.personel.localeCompare(b.personel, 'tr');
    });

    const withRank = rows.map((row, index) => ({
      sira: index + 1,
      ...row,
    }));

    return NextResponse.json({
      ay,
      agirliklar: {
        bireysel: bireyselWeight,
        yetkili: yetkiliWeight,
        ismail: ismailWeight,
      },
      items: withRank,
    });
  } catch (error) {
    console.error('GET /api/puanlama/aylik error:', error);
    return NextResponse.json({ error: 'Aylık puanlama verisi alınamadı' }, { status: 500 });
  }
}

