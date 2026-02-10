/**
 * @deprecated Legacy sync module. Canonical sync lives in lib/sync/*.
 */

import { createSyncManager } from '@/lib/sync/sync-manager';

export async function fetchServicesFromSheets() {
  return [];
}

export async function extractUniqueTekneler() {
  return [];
}

export async function importServicesToDatabase() {
  const sync = await createSyncManager();
  if (!sync) {
    return { toplamServis: 0, tekneler: 0, yeniServis: 0, guncellenenServis: 0 };
  }
  const result = await sync.syncFromSheets('PLANLAMA', { mode: 'incremental' });
  return {
    toplamServis: result.created + result.updated,
    tekneler: 0,
    yeniServis: result.created,
    guncellenenServis: result.updated,
  };
}

export async function exportToSheets() {
  throw new Error('Deprecated: Sheet write-back is disabled.');
}

export async function syncServices() {
  return importServicesToDatabase();
}

export async function autoSync() {
  return syncServices();
}

