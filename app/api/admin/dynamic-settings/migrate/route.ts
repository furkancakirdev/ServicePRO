import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { migrateHardcodedToDynamic } from '@/lib/settings/dynamic-migration';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const sonuc = await migrateHardcodedToDynamic();
    return NextResponse.json(sonuc);
  } catch (error) {
    console.error('Dynamic migration API hatasi:', error);
    return NextResponse.json({ error: 'Migration tamamlanamadı' }, { status: 500 });
  }
}
