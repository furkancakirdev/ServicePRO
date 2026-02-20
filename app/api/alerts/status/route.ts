import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { getLatestAlertStatus } from '@/lib/alerts/evaluator';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const status = await getLatestAlertStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('GET /api/alerts/status error:', error);
    return NextResponse.json({ error: 'Alert status bilgisi getirilemedi' }, { status: 500 });
  }
}
