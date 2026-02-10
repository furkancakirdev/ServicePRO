
import { createSyncManager } from '../lib/sync/sync-manager';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('Starting sync...');
    try {
        const sync = await createSyncManager();
        if (!sync) {
            console.error('Sync manager could not be created. Check Google credentials.');
            return;
        }
        const result = await sync.syncFromSheets('PLANLAMA', { mode: 'incremental' });
        console.log('Sync result:', {
            success: result.success,
            created: result.created,
            updated: result.updated,
            deleted: result.deleted,
            skipped: result.skipped,
            errors: result.errors.length,
        });
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

main();
