import { createSyncManager } from '../lib/sync/sync-manager';

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

async function validate(sync: Awaited<ReturnType<typeof createSyncManager>>, title: string): Promise<ValidationResult> {
  const result = (await sync!.validatePlanlamaAgainstDb({
    includeAllSamples: true,
    sampleLimit: 2000,
  })) as ValidationResult;

  if (!result.ok || !result.summary) {
    console.error(`${title}: doğrulama başarısız`, result.error || result.details?.join(' | ') || '');
    return result;
  }

  console.log(`\n=== ${title} ===`);
  console.log(`Eksik(DB): ${result.summary.missingInDbCount}`);
  console.log(`Fazla(DB): ${result.summary.extraInDbCount}`);
  console.log(`Mismatch: ${result.summary.mismatchedCount}`);
  console.log(`Kritik mismatch: ${result.summary.criticalMismatchCount}`);
  return result;
}

async function main() {
  console.log('Sync uzlaştırma başlatılıyor...');
  const dryRun = hasFlag('--dry-run');

  const sync = await createSyncManager();
  if (!sync) {
    console.error('Sync manager başlatılamadı. Google credential ayarlarını kontrol edin.');
    process.exit(1);
  }

  const before = await validate(sync, 'Uzlaştırma Öncesi');
  if (!before.ok || !before.summary) {
    process.exit(1);
  }

  if (isClean(before.summary)) {
    console.log('\nVeri zaten temiz, uzlaştırma gerekmedi.');
    return;
  }

  if (dryRun) {
    console.log('\nDry-run modu: full reset uygulanmadı.');
    process.exit(2);
  }

  console.log('\nFull reset sync çalıştırılıyor...');
  const syncResult = await sync.syncFromSheets('PLANLAMA', { mode: 'full_reset' });
  console.log(
    `Full reset sonucu: success=${syncResult.success} created=${syncResult.created} updated=${syncResult.updated} deleted=${syncResult.deleted} skipped=${syncResult.skipped} errors=${syncResult.errors.length}`
  );
  if (!syncResult.success) {
    process.exit(1);
  }

  const after = await validate(sync, 'Uzlaştırma Sonrası');
  if (!after.ok || !after.summary) {
    process.exit(1);
  }

  if (!isClean(after.summary)) {
    console.error('\nUzlaştırma sonrası hâlâ fark var. Manuel inceleme gerekli.');
    process.exit(3);
  }

  console.log('\nUzlaştırma tamamlandı, farklar temizlendi.');
}

main().catch((error) => {
  console.error('Beklenmeyen hata:', error);
  process.exit(1);
});

