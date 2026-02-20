import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { yedekKlasoruYoluGetir } from '@/lib/backup';

function dosyaAdiniGuvenliHaleGetir(hamDeger: string): string {
  const temiz = path.basename(hamDeger.trim());
  return temiz.endsWith('.json') ? temiz : `${temiz}.json`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? searchParams.get('dosyaAdi');
  if (!id) {
    return NextResponse.json({ error: 'id parametresi zorunludur' }, { status: 400 });
  }

  try {
    const dosyaAdi = dosyaAdiniGuvenliHaleGetir(id);
    const yedekKlasoru = yedekKlasoruYoluGetir();
    const dosyaYolu = path.join(yedekKlasoru, dosyaAdi);

    const icerik = await fs.readFile(dosyaYolu, 'utf8');
    return new NextResponse(icerik, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${dosyaAdi}"`,
      },
    });
  } catch (error) {
    console.error('Backup indirme hatasi:', error);
    return NextResponse.json({ error: 'Backup dosyasi bulunamadi' }, { status: 404 });
  }
}
