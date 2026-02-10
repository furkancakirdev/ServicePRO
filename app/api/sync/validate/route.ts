import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { createSyncManager } from '@/lib/sync/sync-manager';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sampleLimitRaw = Number(searchParams.get('sampleLimit') ?? 50);
    const sampleLimit = Number.isFinite(sampleLimitRaw) ? sampleLimitRaw : 50;
    const includeAllSamples = searchParams.get('includeAll') === '1';

    const syncManager = await createSyncManager();
    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    const validation = await syncManager.validatePlanlamaAgainstDb({ sampleLimit, includeAllSamples });

    if (!validation.ok) {
      return NextResponse.json(validation, { status: 409 });
    }

    return NextResponse.json(validation);
  } catch (error) {
    console.error('GET /api/sync/validate error:', error);
    return NextResponse.json(
      { error: 'Sheet doğrulama başarısız', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
