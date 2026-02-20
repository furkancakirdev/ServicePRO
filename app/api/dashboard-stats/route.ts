import { NextResponse } from 'next/server';
import { getDashboardStats, type DashboardRangeDays } from '@/lib/api/dashboard-service';

function rangeParametresiniAyristir(raw: string | null): DashboardRangeDays {
  if (raw === '30') return 30;
  if (raw === '90') return 90;
  return 7;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = rangeParametresiniAyristir(searchParams.get('range'));
    const stats = await getDashboardStats(range);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/dashboard-stats error:', error);
    return NextResponse.json(
      {
        error: 'Istatistikler getirilemedi',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
