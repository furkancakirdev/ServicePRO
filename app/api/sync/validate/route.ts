import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { readSettings } from '@/lib/settings/settings-store';
import { createSyncManager } from '@/lib/sync/sync-manager';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  try {
    const settings = readSettings();
    if (auth.payload.role !== 'ADMIN' && settings.access?.yetkiliCanRunSyncValidation === false) {
      return NextResponse.json(
        { error: 'Sync doğrulama işlemi Yetkili rolü için kapalı' },
        { status: 403 }
      );
    }

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

    const validation = await syncManager.validatePlanlamaAgainstDb({
      sampleLimit,
      includeAllSamples,
    });

    const requiredFields = ['tekneAdi', 'tarih', 'durum', 'adres', 'yer', 'irtibatKisi', 'telefon'];
    const mismatchByField = validation.mismatchByField ?? {};
    const requiredFieldValidation = requiredFields.map((field) => ({
      field,
      mismatchCount: mismatchByField[field] ?? 0,
      ok: (mismatchByField[field] ?? 0) === 0,
    }));

    const payload = {
      ...validation,
      requiredFieldValidation,
    };

    if (!validation.ok) {
      return NextResponse.json(payload, { status: 409 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('GET /api/sync/validate error:', error);
    return NextResponse.json(
      {
        error: 'Sheet doğrulama başarısız',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
