import { NextRequest } from 'next/server';
import { POST as backupRestorePost } from '@/app/api/backup/restore/route';

export async function POST(request: NextRequest) {
  return backupRestorePost(request);
}
