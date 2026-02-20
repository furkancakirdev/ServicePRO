import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { otomatikYedekCalistir, sonrakiGunlukCalismaZamani } from '@/lib/backup/scheduler';

type CronBackupIstekGovdesi = {
  retentionGun?: number;
  minimumYedekSayisi?: number;
};

function cronSecretGecerliMi(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  const querySecret = new URL(request.url).searchParams.get('secret')?.trim();
  return headerSecret === secret || querySecret === secret;
}

async function cronYetkilendir(
  request: NextRequest
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (cronSecretGecerliMi(request)) return { ok: true };

  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return { ok: false, response: auth.response };

  return { ok: true };
}

async function cronCalistir(
  request: NextRequest,
  govde: CronBackupIstekGovdesi
): Promise<NextResponse> {
  const yetki = await cronYetkilendir(request);
  if (!yetki.ok) return yetki.response;

  try {
    const sonuc = await otomatikYedekCalistir({
      retentionGun: govde.retentionGun,
      minimumYedekSayisi: govde.minimumYedekSayisi,
    });

    return NextResponse.json(
      {
        success: true,
        ...sonuc,
        sonrakiCalismaZamani: sonrakiGunlukCalismaZamani(),
      },
      { status: 200 }
    );
  } catch (hata) {
    const mesaj = hata instanceof Error ? hata.message : 'Cron backup calistirilamadi';
    return NextResponse.json({ success: false, error: mesaj }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const retentionGun = Number(new URL(request.url).searchParams.get('retentionGun'));
  const minimumYedekSayisi = Number(new URL(request.url).searchParams.get('minimumYedekSayisi'));

  return cronCalistir(request, {
    retentionGun: Number.isFinite(retentionGun) ? retentionGun : undefined,
    minimumYedekSayisi: Number.isFinite(minimumYedekSayisi)
      ? minimumYedekSayisi
      : undefined,
  });
}

export async function POST(request: NextRequest) {
  let govde: CronBackupIstekGovdesi = {};
  try {
    govde = (await request.json()) as CronBackupIstekGovdesi;
  } catch {
    govde = {};
  }

  return cronCalistir(request, govde);
}
