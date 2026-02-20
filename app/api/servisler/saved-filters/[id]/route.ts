import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function keyPrefixOlustur(userId: string): string {
  return `servis.savedFilter.${userId}.`;
}

function filtreKeyOlustur(userId: string, filtreId: string): string {
  return `${keyPrefixOlustur(userId)}${filtreId}`;
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const filtreId = params.id?.trim();
  if (!filtreId) {
    return NextResponse.json({ error: 'Filtre ID zorunludur' }, { status: 400 });
  }

  const key = filtreKeyOlustur(auth.payload.userId, filtreId);

  const sonuc = await prisma.systemSetting.deleteMany({
    where: {
      key,
      category: 'filters',
    },
  });

  if (sonuc.count === 0) {
    return NextResponse.json({ error: 'Kayitli filtre bulunamadi' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

