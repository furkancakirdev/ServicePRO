import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { createSyncManager } from '../lib/sync/sync-manager';

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
  samples?: {
    missingInDb: string[];
    extraInDb: string[];
    mismatched: Array<{
      id: string;
      diffs: Array<{ field: string; sheet: string | null; db: string | null }>;
    }>;
  };
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArgValue(name: string): string | null {
  const idx = process.argv.findIndex((arg) => arg === name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

async function main() {
  console.log('Sheet-DB tam doğrulama başlatılıyor...');

  const sync = await createSyncManager();
  if (!sync) {
    console.error('Sync manager başlatılamadı. Google credential ayarlarını kontrol edin.');
    process.exit(1);
  }

  const result = (await sync.validatePlanlamaAgainstDb({
    includeAllSamples: hasFlag('--all') || !getArgValue('--sampleLimit'),
    sampleLimit: Number(getArgValue('--sampleLimit') || 2000),
  })) as ValidationResult;

  if (!result.ok) {
    console.error('Doğrulama başarısız:', result.error || result.details?.join(' | ') || 'Unknown error');
    process.exit(1);
  }

  const summary = result.summary;
  if (!summary) {
    console.error('Doğrulama çıktısında summary bulunamadı.');
    process.exit(1);
  }

  console.log('\n=== Doğrulama Özeti ===');
  console.log(`Sheet satır: ${summary.totalSheetRows}`);
  console.log(`Etkili satır: ${summary.effectiveSheetRows}`);
  console.log(`DB kontrol edilen: ${summary.dbRowsChecked}`);
  console.log(`Eksik (DB): ${summary.missingInDbCount}`);
  console.log(`Fazla (DB): ${summary.extraInDbCount}`);
  console.log(`Mismatch: ${summary.mismatchedCount}`);
  console.log(`Kritik mismatch: ${summary.criticalMismatchCount}`);
  console.log(`Durum dışı: ${summary.skippedByStatusCount}`);
  console.log(`Geçersiz satır: ${summary.invalidRowCount}`);

  if (result.mismatchByField && Object.keys(result.mismatchByField).length > 0) {
    const byField = Object.entries(result.mismatchByField)
      .sort((a, b) => b[1] - a[1])
      .map(([field, count]) => `${field}:${count}`)
      .join(', ');
    console.log(`Alan bazlı mismatch: ${byField}`);
  }

  if (result.samples) {
    if (result.samples.missingInDb.length > 0) {
      console.log('\nEksik kayıt örnekleri (Sheet var / DB yok):');
      console.log(result.samples.missingInDb.slice(0, 10).join(', '));
    }
    if (result.samples.extraInDb.length > 0) {
      console.log('\nFazla kayıt örnekleri (DB var / Sheet yok):');
      console.log(result.samples.extraInDb.slice(0, 10).join(', '));
    }
    if (result.samples.mismatched.length > 0) {
      console.log('\nMismatch örnekleri:');
      result.samples.mismatched.slice(0, 5).forEach((row) => {
        const diffs = row.diffs.map((d) => `${d.field}:sheet=${d.sheet ?? '-'}|db=${d.db ?? '-'}`).join(' ; ');
        console.log(`- ${row.id} -> ${diffs}`);
      });
    }
  }

  const outputPathArg = getArgValue('--out');
  const shouldWriteReport = hasFlag('--write-report') || Boolean(outputPathArg);
  if (shouldWriteReport) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath =
      outputPathArg ||
      path.join(process.cwd(), 'reports', `sync-validation-${timestamp}.json`);
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`Rapor yazıldı: ${reportPath}`);
  }

  const strict = hasFlag('--strict');
  if (strict && (summary.criticalMismatchCount > 0 || summary.missingInDbCount > 0 || summary.extraInDbCount > 0)) {
    console.error('Strict mod: kritik mismatch/eksik/fazla kayıt bulundu.');
    process.exit(2);
  }

  console.log('Doğrulama tamamlandı.');
}

main().catch((error) => {
  console.error('Beklenmeyen hata:', error);
  process.exit(1);
});
