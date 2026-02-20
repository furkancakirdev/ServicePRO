import { prisma } from '../lib/prisma';
import { createSyncManager } from '../lib/sync/sync-manager';
import { ServisDurumu } from '@prisma/client';

type ValidationResult = {
  ok: boolean;
  error?: string;
  details?: string[];
  summary?: {
    totalSheetRows: number;
    effectiveSheetRows: number;
    dbRowsChecked: number;
    missingInDbCount: number;
    extraInDbCount: number;
    mismatchedCount: number;
    skippedByStatusCount: number;
    invalidRowCount: number;
    criticalMismatchCount: number;
  };
  mismatchByField?: Record<string, number>;
};

const REQUIRED_FIELDS = ['tekneAdi', 'tarih', 'durum', 'adres', 'yer', 'irtibatKisi', 'telefon'] as const;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getScope(): 'sheet-only' | 'all' {
  const scopeArg = process.argv.find((arg) => arg.startsWith('--scope='));
  const value = scopeArg?.split('=')[1]?.trim().toLowerCase();
  if (value === 'all') return 'all';
  return 'sheet-only';
}

async function main() {
  const scope = getScope();
  const strict = hasFlag('--strict');

  console.log(`Sheet reset started. scope=${scope}`);

  const syncManager = await createSyncManager();
  if (!syncManager) {
    console.error('Sync manager could not start. Check Google credentials.');
    process.exit(1);
  }

  const beforeTotal = await prisma.service.count();
  const beforeSheetOnly = await prisma.service.count({
    where: { id: { startsWith: 'sheet-svc-' } },
  });

  let deletedCount = 0;
  if (scope === 'sheet-only') {
    const deleted = await prisma.service.deleteMany({
      where: { id: { startsWith: 'sheet-svc-' } },
    });
    deletedCount = deleted.count;
    await prisma.tekne.updateMany({
      where: { id: { startsWith: 'sheet-tekne-' } },
      data: { aktif: false },
    });
  } else {
    const deleted = await prisma.service.deleteMany({});
    deletedCount = deleted.count;
  }

  const syncResult = await syncManager.syncFromSheets('PLANLAMA', {
    mode: scope === 'all' ? 'full_reset' : 'incremental',
  });

  const validation = (await syncManager.validatePlanlamaAgainstDb({
    includeAllSamples: true,
    sampleLimit: 2000,
  })) as ValidationResult;

  const requiredFieldValidation = REQUIRED_FIELDS.map((field) => ({
    field,
    mismatchCount: validation.mismatchByField?.[field] ?? 0,
    ok: (validation.mismatchByField?.[field] ?? 0) === 0,
  }));

  const afterTotal = await prisma.service.count();
  const afterSheetOnly = await prisma.service.count({
    where: { id: { startsWith: 'sheet-svc-' } },
  });

  const excludedStatusesCount = await prisma.service.count({
    where: {
      durum: {
        in: [ServisDurumu.TAMAMLANDI, ServisDurumu.KESIF_KONTROL],
      },
    },
  });

  const statusDistribution = await prisma.service.groupBy({
    by: ['durum'],
    _count: { _all: true },
    where: { id: { startsWith: 'sheet-svc-' } },
    orderBy: { durum: 'asc' },
  });

  const output = {
    scope,
    deletedCount,
    syncResult: {
      success: syncResult.success,
      created: syncResult.created,
      updated: syncResult.updated,
      deleted: syncResult.deleted,
      skipped: syncResult.skipped,
      errors: syncResult.errors.length,
    },
    counts: {
      beforeTotal,
      beforeSheetOnly,
      afterTotal,
      afterSheetOnly,
    },
    validation: {
      ok: validation.ok,
      summary: validation.summary,
      requiredFieldValidation,
    },
    excludedStatusesCount,
    statusDistribution: statusDistribution.map((item) => ({
      durum: item.durum,
      count: item._count._all,
    })),
  };

  console.log(JSON.stringify(output, null, 2));

  const hasRequiredFieldMismatch = requiredFieldValidation.some((item) => !item.ok);
  if (!validation.ok || hasRequiredFieldMismatch) {
    process.exit(2);
  }

  if (strict && excludedStatusesCount > 0) {
    console.error('Strict mode failed: excluded statuses exist in DB.');
    process.exit(3);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
