import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { readSettings } from '@/lib/settings/settings-store';
import { prisma } from '@/lib/prisma';
import { createSyncManager } from '@/lib/sync/sync-manager';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const settings = readSettings();
  if (!settings.sync.enabled) {
    return NextResponse.json(
      { error: 'Sync işlemleri ayarlardan devre dışı bırakıldı' },
      { status: 409 }
    );
  }

  if (!settings.sync.allowFullReset) {
    return NextResponse.json(
      { error: 'Full reset işlemi ayarlardan kapalı' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return NextResponse.json(
      {
        error: 'Full reset için confirm=true zorunludur.',
        hint: 'Body: { "confirm": true }',
      },
      { status: 400 }
    );
  }

  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const scope = body?.scope === 'all' ? 'all' : 'sheet-only';

  try {
    const syncManager = await createSyncManager();
    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    const beforeServiceCount = await prisma.service.count();
    const beforeSheetServiceCount = await prisma.service.count({
      where: { id: { startsWith: 'sheet-svc-' } },
    });

    let result;
    let deletedByScope = 0;

    if (scope === 'sheet-only') {
      const deleted = await prisma.service.deleteMany({
        where: { id: { startsWith: 'sheet-svc-' } },
      });
      deletedByScope = deleted.count;

      await prisma.tekne.updateMany({
        where: { id: { startsWith: 'sheet-tekne-' } },
        data: { aktif: false },
      });

      result = await syncManager.syncFromSheets('PLANLAMA', {
        mode: 'incremental',
        runId,
      });
    } else {
      result = await syncManager.syncFromSheets('PLANLAMA', {
        mode: 'full_reset',
        runId,
      });
      deletedByScope = result.deleted;
    }

    const validation = await syncManager.validatePlanlamaAgainstDb({
      includeAllSamples: true,
    });

    const finishedAt = new Date().toISOString();
    return NextResponse.json({
      runId,
      mode: scope === 'sheet-only' ? 'sheet_only_reset' : 'full_reset',
      scope,
      sheet: 'PLANLAMA',
      startedAt,
      finishedAt,
      success: result.success && validation.ok === true,
      totals: {
        created: result.created,
        updated: result.updated,
        deleted: deletedByScope,
        skipped: result.skipped,
        errors: result.errors.length,
      },
      summary: {
        servicesBeforeReset: beforeServiceCount,
        sheetServicesBeforeReset: beforeSheetServiceCount,
        servicesDeleted: deletedByScope,
        servicesImported: result.created,
      },
      validation,
      result,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Full reset sync error:', error);
    return NextResponse.json(
      {
        error: 'Full reset sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
