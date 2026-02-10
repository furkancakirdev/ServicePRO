import { NextRequest, NextResponse } from 'next/server';
import { createSyncManager } from '@/lib/sync/sync-manager';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without auth
  if (process.env.NODE_ENV === 'development') {
    // Continue without auth
  } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const modeParam = new URL(request.url).searchParams.get('mode');
    const mode = modeParam === 'full_reset' ? 'full_reset' : 'incremental';
    const syncManager = await createSyncManager();
    
    if (!syncManager) {
      // Log but don't fail - might be missing credentials
      console.warn('Sync skipped: Google Sheets credentials not configured');
      return NextResponse.json({
        success: false,
        error: 'Google Sheets credentials not configured',
        timestamp: new Date().toISOString(),
      });
    }

    const startTime = Date.now();
    const results = await syncManager.syncAllFromSheets(mode);
    const duration = Date.now() - startTime;

    // Calculate totals
    const totals = Object.values(results).reduce(
      (acc, result) => ({
        created: acc.created + result.created,
        updated: acc.updated + result.updated,
        deleted: acc.deleted + result.deleted,
        errors: acc.errors + result.errors.length,
        sheetsProcessed: acc.sheetsProcessed + 1,
      }),
      { created: 0, updated: 0, deleted: 0, errors: 0, sheetsProcessed: 0 }
    );

    // Log sync to database
    await prisma.syncLog.create({
      data: {
        sheetName: 'ALL',
        syncType: mode === 'full_reset' ? 'FULL' : 'INCREMENTAL',
        status: totals.errors > 0 ? 'PARTIAL' : 'SUCCESS',
        recordsCreated: totals.created,
        recordsUpdated: totals.updated,
        recordsDeleted: totals.deleted,
        durationMs: duration,
        errors: JSON.stringify(
          Object.entries(results)
            .filter(([, r]) => r.errors.length > 0)
            .map(([sheetName, r]) => ({
              sheet: sheetName,
              errors: r.errors,
            }))
        ),
      },
    });

    const finishedAt = new Date().toISOString();
    return NextResponse.json({
      runId,
      mode,
      startedAt,
      finishedAt,
      success: totals.errors === 0,
      results,
      totals,
      duration: `${duration}ms`,
      timestamp: finishedAt,
    });
  } catch (error) {
    console.error('Cron sync error:', error);

    // Log failed sync
    await prisma.syncLog.create({
      data: {
        sheetName: 'ALL',
        syncType: 'INCREMENTAL',
        status: 'FAILED',
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsDeleted: 0,
        errors: JSON.stringify({
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : null,
        }),
      },
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
