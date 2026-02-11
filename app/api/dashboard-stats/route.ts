import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/api/dashboard-service';

export async function GET() {
  try {
    const stats = await getDashboardStats();
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
