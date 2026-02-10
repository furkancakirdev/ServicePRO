import { NextRequest, NextResponse } from 'next/server';
import { createSyncManager } from '@/lib/sync/sync-manager';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

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

  try {
    const syncManager = await createSyncManager();

    if (!syncManager) {
      return NextResponse.json(
        { error: 'Google Sheets credentials not configured' },
        { status: 500 }
      );
    }

    const beforeServiceCount = await prisma.service.count();

    // PLANLAMA full_reset mode:
    // 1) Deletes all service records
    // 2) Re-imports data from Google Sheets from scratch
    const result = await syncManager.syncFromSheets('PLANLAMA', {
      mode: 'full_reset',
      runId,
    });

    const finishedAt = new Date().toISOString();
    return NextResponse.json({
      runId,
      mode: 'full_reset',
      sheet: 'PLANLAMA',
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
      summary: {
        servicesBeforeReset: beforeServiceCount,
        servicesDeleted: result.deleted,
        servicesImported: result.created,
      },
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
