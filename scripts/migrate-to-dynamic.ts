import { migrateHardcodedToDynamic } from '../lib/settings/dynamic-migration';

async function calistir(): Promise<void> {
  const sonuc = await migrateHardcodedToDynamic();
  console.log('Dinamik ayarlara migration tamamlandi:');
  console.log(JSON.stringify(sonuc, null, 2));
}

calistir().catch((error: unknown) => {
  console.error('Migration hatasi:', error);
  process.exit(1);
});
