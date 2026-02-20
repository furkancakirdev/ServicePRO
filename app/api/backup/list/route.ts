import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { yedekleriListele } from '@/lib/backup';
import type { YedekListeElemani } from '@/lib/backup/types';

function yedekApiModelineCevir(yedek: YedekListeElemani): Omit<YedekListeElemani, 'dosyaYolu'> {
  const { dosyaYolu: _dosyaYolu, ...apiModel } = yedek;
  return apiModel;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const yedekler = await yedekleriListele();
    return NextResponse.json(yedekler.map((yedek) => yedekApiModelineCevir(yedek)));
  } catch (error) {
    console.error('Backup list endpoint hatasi:', error);
    return NextResponse.json({ error: 'Backup listesi alinamadi' }, { status: 500 });
  }
}
