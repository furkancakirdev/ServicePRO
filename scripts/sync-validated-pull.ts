import { createSyncManager } from '../lib/sync';

type ValidationSummary = {
  missingInDbCount: number;
  extraInDbCount: number;
  mismatchedCount: number;
  criticalMismatchCount: number;
};

type ValidationResult = {
  ok: boolean;
  summary?: ValidationSummary;
  error?: string;
  details?: string[];
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function isClean(summary: ValidationSummary): boolean {
  return (
    summary.missingInDbCount === 0 &&
    summary.extraInDbCount === 0 &&
    summary.mismatchedCount === 0 &&
    summary.criticalMismatchCount === 0
  );
}

function hasCriticalMismatch(summary: ValidationSummary): boolean {
  return summary.criticalMismatchCount > 0;
}

async function runValidation(
  sync: NonNullable<Awaited<ReturnType<typeof createSyncManager>>>,
  title: string
): Promise<ValidationResult> {
  const result = (await sync.validatePlanlamaAgainstDb({
    includeAllSamples: true,
    sampleLimit: 2000,
  })) as ValidationResult;

  if (!result.ok || !result.summary) {
    console.error(`${title}: validation failed`, result.error || result.details?.join(' | ') || '');
    return result;
  }

  console.log(`\n=== ${title} ===`);
  console.log(`Missing(DB): ${result.summary.missingInDbCount}`);
  console.log(`Extra(DB): ${result.summary.extraInDbCount}`);
  console.log(`Mismatch: ${result.summary.mismatchedCount}`);
  console.log(`Critical mismatch: ${result.summary.criticalMismatchCount}`);
  return result;
}

async function main() {
  const autoReconcile = hasFlag('--auto-reconcile');
  const strict = hasFlag('--strict');
  console.log('Validated pull flow started...');

  const sync = await createSyncManager();
  if (!sync) {
    console.error('Sync manager could not start. Check Google credentials.');
    process.exit(1);
  }

  const before = await runValidation(sync, 'Before Incremental Pull');
  if (!before.ok || !before.summary) process.exit(1);

  console.log('\nRunning incremental pull from PLANLAMA...');
  const incremental = await sync.syncFromSheets('PLANLAMA', { mode: 'incremental' });
  console.log(
    `Incremental result: success=${incremental.success} created=${incremental.created} updated=${incremental.updated} deleted=${incremental.deleted} skipped=${incremental.skipped} errors=${incremental.errors.length}`
  );

  const after = await runValidation(sync, 'After Incremental Pull');
  if (!after.ok || !after.summary) process.exit(1);

  if (isClean(after.summary)) {
    console.log('\nValidated pull completed with clean result.');
    return;
  }

  if (!hasCriticalMismatch(after.summary)) {
    console.warn('\nNon-critical differences remain after incremental pull (missing/extra/mismatch).');
    console.warn('Critical mismatch is 0, so flow is accepted as healthy for demo continuity.');
    return;
  }

  if (strict && !autoReconcile) {
    console.error('\nStrict mode: critical mismatch detected after incremental pull.');
    process.exit(2);
  }

  if (!autoReconcile) {
    console.error('\nCritical mismatch remains. Re-run with --auto-reconcile to apply controlled full reset.');
    process.exit(2);
  }

  console.log('\nCritical mismatch gate triggered. Running controlled reconcile (full reset)...');
  const reconcile = await sync.syncFromSheets('PLANLAMA', { mode: 'full_reset' });
  console.log(
    `Reconcile result: success=${reconcile.success} created=${reconcile.created} updated=${reconcile.updated} deleted=${reconcile.deleted} skipped=${reconcile.skipped} errors=${reconcile.errors.length}`
  );
  if (!reconcile.success) process.exit(1);

  const finalValidation = await runValidation(sync, 'After Controlled Reconcile');
  if (!finalValidation.ok || !finalValidation.summary) process.exit(1);

  if (hasCriticalMismatch(finalValidation.summary)) {
    console.error('\nCritical mismatch still exists after controlled reconcile.');
    process.exit(3);
  }

  if (!isClean(finalValidation.summary)) {
    console.warn('\nControlled reconcile finished with non-critical differences.');
  } else {
    console.log('\nValidated pull flow completed cleanly.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
