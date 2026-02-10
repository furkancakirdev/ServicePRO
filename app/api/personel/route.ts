import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { mapRolToDb, mapUnvanToApi, mapUnvanToDb } from '@/lib/personel-mappers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('aktif') === 'true';

    const personeller = await prisma.personel.findMany({
      where: {
        deletedAt: null,
        ...(onlyActive ? { aktif: true } : {}),
      },
      orderBy: { ad: 'asc' },
      select: {
        id: true,
        ad: true,
        rol: true,
        unvan: true,
        aktif: true,
        girisYili: true,
      },
    });

    return NextResponse.json(
      personeller.map((p) => ({
        id: p.id,
        ad: p.ad,
        rol: p.rol,
        unvan: mapUnvanToApi(p.unvan),
        aktif: p.aktif,
        girisYili: p.girisYili,
      })),
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Personel listesi alinamadi:', error);
    return NextResponse.json({ error: 'Personel listesi alinamadi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const ad = String(body.ad ?? '').trim();

    if (!ad) {
      return NextResponse.json({ error: 'Ad alani zorunludur' }, { status: 400 });
    }

    const created = await prisma.personel.create({
      data: {
        ad,
        rol: mapRolToDb(body.rol),
        unvan: mapUnvanToDb(body.unvan),
        aktif: body.aktif !== undefined ? Boolean(body.aktif) : true,
        girisYili: body.girisYili ? Number(body.girisYili) : null,
      },
      select: {
        id: true,
        ad: true,
        rol: true,
        unvan: true,
        aktif: true,
        girisYili: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'CREATE',
        entityTipi: 'Personel',
        entityId: created.id,
        detay: `Yeni personel olusturuldu: ${created.ad}`,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        ad: created.ad,
        rol: created.rol,
        unvan: mapUnvanToApi(created.unvan),
        aktif: created.aktif,
        girisYili: created.girisYili,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Personel olusturulamadi:', error);
    return NextResponse.json({ error: 'Personel olusturulamadi' }, { status: 500 });
  }
}
