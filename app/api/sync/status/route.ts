import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { SyncManager } from '@/lib/sync/sync-manager';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

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
  const minutesSinceLastRun =
    latestRunAt !== null ? Math.floor((now.getTime() - new Date(latestRunAt).getTime()) / (1000 * 60)) : null;

  const staleThresholdMinutes = 15;
  const cronHealth = {
    hasRun: Boolean(latestRunAt),
    staleThresholdMinutes,
    minutesSinceLastRun,
    isStale: minutesSinceLastRun === null ? true : minutesSinceLastRun > staleThresholdMinutes,
    latestStatus: latestLog?.status ?? null,
    latestRunAt,
  };

  const summary = {
    last10Runs: recentLogs.length,
    successCount: recentLogs.filter((log) => log.status === 'SUCCESS').length,
    partialCount: recentLogs.filter((log) => log.status === 'PARTIAL').length,
    failedCount: recentLogs.filter((log) => log.status === 'FAILED').length,
  };

  return NextResponse.json({
    ok: true,
    lastRun,
    latestSuccess,
    recentLogs,
    cronHealth,
    summary,
    checkedAt: new Date().toISOString(),
  });
}
