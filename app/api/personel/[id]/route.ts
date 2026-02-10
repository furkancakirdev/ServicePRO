import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { mapRolToDb, mapUnvanToApi, mapUnvanToDb } from '@/lib/personel-mappers';

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const personel = await prisma.personel.findUnique({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true,
        ad: true,
        rol: true,
        unvan: true,
        aktif: true,
        girisYili: true,
      },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadi' }, { status: 404 });
    }

    const latestAylikPerformans = await prisma.aylikPerformans.findFirst({
      where: { personnelId: params.id },
      orderBy: { ay: 'desc' },
      select: {
        servisSayisi: true,
        toplamPuan: true,
      },
    });

    const rozetGruplari = await prisma.aylikPerformans.groupBy({
      by: ['rozet'],
      where: { personnelId: params.id, rozet: { not: null } },
      _count: { _all: true },
    });

    const rozetCount = { ALTIN: 0, GUMUS: 0, BRONZ: 0 };
    for (const grup of rozetGruplari) {
      if (grup.rozet) rozetCount[grup.rozet] = grup._count._all;
    }

    return NextResponse.json(
      {
        id: personel.id,
        ad: personel.ad,
        rol: personel.rol,
        unvan: mapUnvanToApi(personel.unvan),
        aktif: personel.aktif,
        girisYili: personel.girisYili,
        aylikServisSayisi: latestAylikPerformans?.servisSayisi ?? 0,
        aylikOrtalamaPuan: latestAylikPerformans?.toplamPuan ?? 0,
        altinRozet: rozetCount.ALTIN,
        gumusRozet: rozetCount.GUMUS,
        bronzRozet: rozetCount.BRONZ,
        toplamRozetSayisi: rozetCount.ALTIN + rozetCount.GUMUS + rozetCount.BRONZ,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Personel detayi alinamadi:', error);
    return NextResponse.json({ error: 'Personel detayi alinamadi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const ad = body.ad !== undefined ? String(body.ad).trim() : undefined;

    if (ad !== undefined && !ad) {
      return NextResponse.json({ error: 'Ad alani bos olamaz' }, { status: 400 });
    }

    const existing = await prisma.personel.findUnique({
      where: { id: params.id, deletedAt: null },
      select: { id: true, ad: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Personel bulunamadi' }, { status: 404 });
    }

    const updated = await prisma.personel.update({
      where: { id: params.id },
      data: {
        ...(ad !== undefined && { ad }),
        ...(body.rol !== undefined && { rol: mapRolToDb(body.rol) }),
        ...(body.unvan !== undefined && { unvan: mapUnvanToDb(body.unvan) }),
        ...(body.aktif !== undefined && { aktif: Boolean(body.aktif) }),
        ...(body.girisYili !== undefined && { girisYili: body.girisYili ? Number(body.girisYili) : null }),
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
        islemTuru: 'UPDATE',
        entityTipi: 'Personel',
        entityId: updated.id,
        detay: `Personel guncellendi: ${updated.ad}`,
      },
    });

    return NextResponse.json({
      id: updated.id,
      ad: updated.ad,
      rol: updated.rol,
      unvan: mapUnvanToApi(updated.unvan),
      aktif: updated.aktif,
      girisYili: updated.girisYili,
    });
  } catch (error) {
    console.error('Personel guncellenemedi:', error);
    return NextResponse.json({ error: 'Personel guncellenemedi' }, { status: 500 });
  }
}
