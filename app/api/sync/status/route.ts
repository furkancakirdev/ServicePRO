import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { SyncManager } from '@/lib/sync/sync-manager';
import { prisma } from '@/lib/prisma';
import { readSettings } from '@/lib/settings/settings-store';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  const settings = readSettings();
  if (auth.payload.role !== 'ADMIN' && settings.access?.yetkiliCanViewSyncLogs === false) {
    return NextResponse.json(
      { error: 'Sync loglarını görüntüleme yetkiniz kapalı' },
      { status: 403 }
    );
  }

  const [lastRun, recentLogs] = await Promise.all([
    Promise.resolve(SyncManager.getLastRun()),
    prisma.syncLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sheetName: true,
        status: true,
        recordsCreated: true,
        recordsUpdated: true,
        recordsDeleted: true,
        durationMs: true,
        createdAt: true,
      },
    }),
  ]);

  const latestLog = recentLogs[0] ?? null;
  const latestSuccess = recentLogs.find((log) => log.status === 'SUCCESS' || log.status === 'PARTIAL') ?? null;

  const now = new Date();
  const latestRunAt = latestLog?.createdAt ?? null;
  const lastSuccessfulAt = latestSuccess?.createdAt ?? null;
  const freshnessReferenceAt = lastSuccessfulAt ?? latestRunAt;
  const minutesSinceLastRun = latestRunAt !== null
    ? Math.floor((now.getTime() - new Date(latestRunAt).getTime()) / (1000 * 60))
    : null;
  const ageSeconds = freshnessReferenceAt !== null
    ? Math.floor((now.getTime() - new Date(freshnessReferenceAt).getTime()) / 1000)
    : null;

  const staleThresholdMinutes = settings.sync.staleThresholdMinutes;

  const cronHealth = {
    hasRun: Boolean(latestRunAt),
    staleThresholdMinutes,
    minutesSinceLastRun,
    isStale: minutesSinceLastRun === null ? true : minutesSinceLastRun > staleThresholdMinutes,
    latestStatus: latestLog?.status ?? null,
    latestRunAt,
    lastSuccessfulAt,
    ageSeconds,
  };

  const summary = {
    last10Runs: recentLogs.length,
    successCount: recentLogs.filter((log) => log.status === 'SUCCESS').length,
    partialCount: recentLogs.filter((log) => log.status === 'PARTIAL').length,
    failedCount: recentLogs.filter((log) => log.status === 'FAILED').length,
  };

  return NextResponse.json({
    ok: true,
    config: {
      syncEnabled: settings.sync.enabled,
      staleThresholdMinutes,
      defaultSheet: settings.sync.defaultSheet,
      validationSampleLimit: settings.sync.validationSampleLimit,
    },
    lastRun,
    latestSuccess,
    lastSuccessfulAt,
    ageSeconds,
    stale: cronHealth.isStale,
    recentLogs,
    cronHealth,
    summary,
    checkedAt: new Date().toISOString(),
  });
}
