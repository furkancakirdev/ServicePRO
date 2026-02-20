import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { yedekOlustur, yedekleriListele } from '@/lib/backup';
import type { YedekListeElemani, YedekTuru } from '@/lib/backup/types';

type YedekOlusturIstekGovdesi = {
  tur?: YedekTuru;
};

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
    console.error('Backup listesi hatasi:', error);
    return NextResponse.json({ error: 'Backup listesi alinamadi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    let govde: YedekOlusturIstekGovdesi = {};
    try {
      govde = (await request.json()) as YedekOlusturIstekGovdesi;
    } catch {
      govde = {};
    }

    const tur: YedekTuru = govde.tur === 'otomatik' ? 'otomatik' : 'manuel';
    const olusanYedek = await yedekOlustur({ tur });
    return NextResponse.json(yedekApiModelineCevir(olusanYedek), { status: 201 });
  } catch (error) {
    console.error('Backup olusturma hatasi:', error);
    return NextResponse.json({ error: 'Backup olusturulamadi' }, { status: 500 });
  }
}
