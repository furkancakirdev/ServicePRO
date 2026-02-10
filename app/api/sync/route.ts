import { NextRequest, NextResponse } from 'next/server';
import { createSyncManager } from '@/lib/sync/sync-manager';
import { requireAuth } from '@/lib/auth/api-auth';
import { SHEETS_CONFIG } from '@/lib/sync/sheet-config';

type SheetKey = keyof typeof SHEETS_CONFIG;

function isValidSheetKey(value: string): value is SheetKey {
  return value in SHEETS_CONFIG;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const sheetParam = searchParams.get('sheet');
  const modeParam = searchParams.get('mode');
  const sheetKey = sheetParam && isValidSheetKey(sheetParam) ? sheetParam : null;
  const mode = modeParam === 'full_reset' ? 'full_reset' : 'incremental';
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  try {
    const syncManager = await createSyncManager();

    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    if (sheetKey) {
      const result = await syncManager.syncFromSheets(sheetKey, { mode, runId });
      const finishedAt = new Date().toISOString();
      return NextResponse.json({
        runId,
        mode,
        startedAt,
        finishedAt,
        success: result.success,
        totals: {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
          skipped: result.skipped,
          errors: result.errors.length,
        },
        results: { [sheetKey]: result },
        errors: result.errors,
      });
    }

    const results = await syncManager.syncAllFromSheets(mode);
    const totals = Object.values(results).reduce(
      (acc, result) => ({
        created: acc.created + result.created,
        updated: acc.updated + result.updated,
        deleted: acc.deleted + result.deleted,
        skipped: acc.skipped + result.skipped,
        errors: acc.errors + result.errors.length,
      }),
      { created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 }
    );
    const finishedAt = new Date().toISOString();

    return NextResponse.json({
      runId,
      mode,
      startedAt,
      finishedAt,
      success: totals.errors === 0,
      results,
      totals,
      errors: Object.entries(results).flatMap(([sheet, result]) =>
        result.errors.map((error) => ({ sheet, ...error }))
      ),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const sheetParam = typeof body?.sheet === 'string'
      ? body.sheet
      : typeof body?.sheetKey === 'string'
        ? body.sheetKey
        : null;
    const sheetKey = sheetParam && isValidSheetKey(sheetParam) ? sheetParam : null;
    const mode = body?.mode === 'full_reset' ? 'full_reset' : 'incremental';
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const syncManager = await createSyncManager();

    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    if (sheetKey) {
      const result = await syncManager.syncFromSheets(sheetKey, { mode, runId });
      const finishedAt = new Date().toISOString();
      return NextResponse.json({
        runId,
        mode,
        startedAt,
        finishedAt,
        success: result.success,
        totals: {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
          skipped: result.skipped,
          errors: result.errors.length,
        },
        results: { [sheetKey]: result },
        errors: result.errors,
      });
    }

    const results = await syncManager.syncAllFromSheets(mode);
    const totals = Object.values(results).reduce(
      (acc, r) => ({
        created: acc.created + r.created,
        updated: acc.updated + r.updated,
        deleted: acc.deleted + r.deleted,
        skipped: acc.skipped + r.skipped,
        errors: acc.errors + r.errors.length,
      }),
      { created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 }
    );
    const finishedAt = new Date().toISOString();

    return NextResponse.json({
      runId,
      mode,
      startedAt,
      finishedAt,
      success: Object.values(results).every((r) => r.success),
      totals,
      results,
      errors: Object.entries(results).flatMap(([sheet, r]) =>
        r.errors.map((syncError) => ({ sheet, ...syncError }))
      ),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
