import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { yedektenGeriYukle } from '@/lib/backup/restore';

type RestoreIstekGovdesi = {
  dosyaAdi?: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    let govde: RestoreIstekGovdesi = {};
    try {
      govde = (await request.json()) as RestoreIstekGovdesi;
    } catch {
      govde = {};
    }

    const sonuc = await yedektenGeriYukle({
      dosyaAdi: govde.dosyaAdi,
    });

    return NextResponse.json(sonuc, { status: 200 });
  } catch (hata) {
    const mesaj = hata instanceof Error ? hata.message : 'Restore islemi basarisiz';
    const status = mesaj.includes('bulunamadi') || mesaj.includes('gecersiz') ? 400 : 500;
    return NextResponse.json({ error: mesaj }, { status });
  }
}
