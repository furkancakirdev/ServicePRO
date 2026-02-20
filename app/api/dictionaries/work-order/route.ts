import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { aktifBlokajNedenleriniGetir } from '@/lib/config/blocking-reason-cache';
import { aktifKonumlariGetir } from '@/lib/config/konum-cache';
import { aktifDurumlariGetir } from '@/lib/config/status-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  const [durumlar, konumlar, blokajNedenleri] = await Promise.all([
    aktifDurumlariGetir(),
    aktifKonumlariGetir(),
    aktifBlokajNedenleriniGetir(),
  ]);

  return NextResponse.json({
    statuses: durumlar.map((durum) => ({
      key: durum.key,
      label: durum.label,
      color: durum.color,
      sirasi: durum.sirasi,
    })),
    locations: konumlar.map((konum) => ({
      key: konum.key,
      label: konum.label,
      sirasi: konum.sirasi,
    })),
    blockingReasons: blokajNedenleri.map((neden) => ({
      key: neden.key,
      label: neden.label,
      description: neden.description ?? null,
      durumKey: neden.durumKey,
      sirasi: neden.sirasi,
    })),
  });
}
