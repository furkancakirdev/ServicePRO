import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { readSettings } from '@/lib/settings/settings-store';
import { createSyncManager } from '@/lib/sync/sync-manager';
import { SHEETS_CONFIG } from '@/lib/sync/sheet-config';
import { buildSyncDateValidation } from '@/lib/sync/utils/date-validation';

export const runtime = 'nodejs';
export const maxDuration = 300;

type SheetKey = keyof typeof SHEETS_CONFIG;
const RETRY_BACKOFF_MS = [750, 1500, 3000] as const;

function isValidSheetKey(value: string): value is SheetKey {
  return value in SHEETS_CONFIG;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetry<T>(label: string, task: () => Promise<T>): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= RETRY_BACKOFF_MS.length) break;
      const backoffMs = RETRY_BACKOFF_MS[attempt];
      console.warn(`[sync] ${label} failed on attempt ${attempt + 1}. Retrying in ${backoffMs}ms...`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await wait(backoffMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`[sync] ${label} failed`);
}


export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const sheetParam = searchParams.get('sheet');
  const modeParam = searchParams.get('mode');
  const sheetKey = sheetParam && isValidSheetKey(sheetParam) ? sheetParam : null;
  const mode = modeParam === 'full_reset' ? 'full_reset' : 'incremental';
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  try {
    const settings = readSettings();
    if (!settings.sync.enabled) {
      return NextResponse.json(
        { error: 'Sync işlemleri ayarlardan devre dışı bırakıldı' },
        { status: 409 }
      );
    }

    const syncManager = await createSyncManager();
    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    if (sheetKey) {
      const result = await runWithRetry(`syncFromSheets:${sheetKey}`, () =>
        syncManager.syncFromSheets(sheetKey, { mode, runId })
      );
      const finishedAt = new Date().toISOString();
      const singleResult = { [sheetKey]: result };
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
        results: singleResult,
        dateValidation: buildSyncDateValidation(singleResult),
        errors: result.errors,
      });
    }

    const results = await runWithRetry('syncAllFromSheets', () => syncManager.syncAllFromSheets(mode));

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
      dateValidation: buildSyncDateValidation(results),
      errors: Object.entries(results).flatMap(([sheet, result]) =>
        result.errors.map((error) => ({ sheet, ...error }))
      ),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const settings = readSettings();
    if (!settings.sync.enabled) {
      return NextResponse.json(
        { error: 'Sync işlemleri ayarlardan devre dışı bırakıldı' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const sheetParam =
      typeof body?.sheet === 'string'
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
      const result = await runWithRetry(`syncFromSheets:${sheetKey}`, () =>
        syncManager.syncFromSheets(sheetKey, { mode, runId })
      );
      const finishedAt = new Date().toISOString();
      const singleResult = { [sheetKey]: result };
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
        results: singleResult,
        dateValidation: buildSyncDateValidation(singleResult),
        errors: result.errors,
      });
    }

    const results = await runWithRetry('syncAllFromSheets', () => syncManager.syncAllFromSheets(mode));

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
      success: Object.values(results).every((result) => result.success),
      totals,
      results,
      dateValidation: buildSyncDateValidation(results),
      errors: Object.entries(results).flatMap(([sheet, result]) =>
        result.errors.map((syncError) => ({ sheet, ...syncError }))
      ),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
