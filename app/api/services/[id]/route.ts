import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const service = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        tekne: {
          select: {
            id: true,
            ad: true,
          },
        },
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
            role: true,
          },
        },
        personeller: {
          include: {
            personel: {
              select: {
                id: true,
                ad: true,
                unvan: true,
              },
            },
          },
          orderBy: [{ rol: 'desc' }],
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('GET /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const existing = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    const requestedDurum = body.durum !== undefined ? toServisDurumu(body.durum, existing.durum) : undefined;
    if (requestedDurum === 'TAMAMLANDI' && existing.durum !== 'TAMAMLANDI') {
      return NextResponse.json(
        { error: 'Servisi tamamlamak için puanlama adımını kullanın.' },
        { status: 409 }
      );
    }

    const shouldUpdateBoat =
      body.tekneId !== undefined || body.tekneAdi !== undefined || body.boatName !== undefined;

    const resolvedBoat = shouldUpdateBoat
      ? await resolveBoatForService(prisma, {
          tekneId: body.tekneId,
          tekneAdi: body.tekneAdi,
          boatName: body.boatName,
        })
      : null;

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(resolvedBoat && {
          tekneId: resolvedBoat.tekneId,
          tekneAdi: resolvedBoat.tekneAdi,
        }),
        ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
        ...(body.saat !== undefined && { saat: body.saat }),
        ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
        ...(body.adres !== undefined && { adres: body.adres }),
        ...(body.yer !== undefined && { yer: body.yer }),
        ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
        ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
        ...(body.telefon !== undefined && { telefon: body.telefon }),
        ...(requestedDurum !== undefined && { durum: requestedDurum }),
        ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
        ...(body.tamamlanmaAt !== undefined && {
          tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null,
        }),
      },
      include: {
        tekne: true,
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Servis güncellendi: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('PUT /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis güncellenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    const existing = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    const requestedDurum = body.durum !== undefined ? toServisDurumu(body.durum, existing.durum) : undefined;
    if (requestedDurum === 'TAMAMLANDI' && existing.durum !== 'TAMAMLANDI') {
      return NextResponse.json(
        { error: 'Servisi tamamlamak için puanlama adımını kullanın.' },
        { status: 409 }
      );
    }

    const shouldUpdateBoat =
      body.tekneId !== undefined || body.tekneAdi !== undefined || body.boatName !== undefined;

    const resolvedBoat = shouldUpdateBoat
      ? await resolveBoatForService(prisma, {
          tekneId: body.tekneId,
          tekneAdi: body.tekneAdi,
          boatName: body.boatName,
        })
      : null;

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(resolvedBoat && {
          tekneId: resolvedBoat.tekneId,
          tekneAdi: resolvedBoat.tekneAdi,
        }),
        ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
        ...(body.saat !== undefined && { saat: body.saat }),
        ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
        ...(body.adres !== undefined && { adres: body.adres }),
        ...(body.yer !== undefined && { yer: body.yer }),
        ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
        ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
        ...(body.telefon !== undefined && { telefon: body.telefon }),
        ...(requestedDurum !== undefined && { durum: requestedDurum }),
        ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
        ...(body.tamamlanmaAt !== undefined && {
          tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null,
        }),
      },
      include: {
        tekne: true,
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Servis kısmi güncellendi: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('PATCH /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const deleted = await prisma.service.updateMany({
      where: { id: params.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'DELETE',
        entityTipi: 'Service',
        entityId: params.id,
        detay: `Servis silindi: ${params.id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis silinemedi' }, { status: 500 });
  }
}
