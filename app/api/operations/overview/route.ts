import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildOperationsOverview, getCurrentWeekRangeUtc } from '@/lib/operations/overview';
import { parseDateOnlyToUtcDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

function resolveRange(searchParams: URLSearchParams): { start: Date; end: Date } {
  const startInput = searchParams.get('start');
  const endInput = searchParams.get('end');
  const parsedStart = parseDateOnlyToUtcDate(startInput);
  const parsedEnd = parseDateOnlyToUtcDate(endInput);

  if (!parsedStart || !parsedEnd || parsedStart > parsedEnd) {
    return getCurrentWeekRangeUtc();
  }

  return { start: parsedStart, end: parsedEnd };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = resolveRange(searchParams);

    const [services, activeTechnicianCount] = await Promise.all([
      prisma.service.findMany({
        where: {
          deletedAt: null,
          OR: [
            {
              tarih: {
                gte: new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate(), 0, 0, 0, 0)),
                lte: new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate(), 23, 59, 59, 999)),
              },
            },
            { tarih: null },
          ],
        },
        select: {
          tarih: true,
          tekneAdi: true,
          yer: true,
          adres: true,
          durum: true,
        },
      }),
      prisma.personel.count({
        where: {
          deletedAt: null,
          aktif: true,
        },
      }),
    ]);

    const overview = buildOperationsOverview({
      services,
      activeTechnicianCount,
      start: range.start,
      end: range.end,
    });

    return NextResponse.json(overview);
  } catch (error) {
    console.error('GET /api/operations/overview error:', error);
    return NextResponse.json(
      {
        error: 'Operasyon overview verisi olusturulamadi',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
