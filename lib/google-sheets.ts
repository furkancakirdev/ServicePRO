/**
 * @deprecated Legacy module. Use lib/sync/* via /api/sync.
 */

import { createSyncManager } from '@/lib/sync/sync-manager';

export async function getAllServices() {
  const sync = await createSyncManager();
  if (!sync) return [];
  return [];
}

export async function getServiceById() {
  return null;
}

export async function addService(): Promise<string> {
  throw new Error('Deprecated: use /api/services');
}

export async function updateService(): Promise<boolean> {
  throw new Error('Deprecated: use /api/services');
}

export function getLastSyncTime(): Date | null {
  return null;
}

export function updateLastSyncTime(): void {
  // no-op
}

export async function syncFromSheets(): Promise<{ services: number; personnel: number }> {
  const sync = await createSyncManager();
  if (!sync) return { services: 0, personnel: 0 };
  const result = await sync.syncFromSheets('PLANLAMA', { mode: 'incremental' });
  return { services: result.created + result.updated, personnel: 0 };
}

export function startAutoSync(): void {
  // Deprecated in app runtime; use /api/cron/sync (Vercel cron)
}

export function stopAutoSync(): void {
  // no-op
}

