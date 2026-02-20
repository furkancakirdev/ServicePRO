import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { readSettings, updateSettings } from '@/lib/settings/settings-store';
import type { AppSettings } from '@/lib/settings/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const settings = readSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Ayarlar getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as Partial<AppSettings>;
    const updatedSettings = updateSettings(body);
    return NextResponse.json(updatedSettings);
  } catch {
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 });
  }
}

