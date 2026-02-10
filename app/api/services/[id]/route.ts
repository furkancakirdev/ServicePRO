import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        tekne: true,
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
            personel: true,
          },
          orderBy: [{ rol: 'desc' }],
        },
        bekleyenParcalar: {
          orderBy: [{ tamamlandi: 'asc' }],
        },
        kapanisRaporu: true,
        puanlar: {
          include: {
            personel: true,
          },
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

    const existing = await prisma.service.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
        ...(body.saat !== undefined && { saat: body.saat }),
        ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
        ...(body.adres !== undefined && { adres: body.adres }),
        ...(body.yer !== undefined && { yer: body.yer }),
        ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
        ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
        ...(body.telefon !== undefined && { telefon: body.telefon }),
        ...(body.durum !== undefined && { durum: body.durum }),
        ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
        ...(body.tamamlanmaAt !== undefined && { tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null }),
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

    const existing = await prisma.service.findUnique({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
        ...(body.saat !== undefined && { saat: body.saat }),
        ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
        ...(body.adres !== undefined && { adres: body.adres }),
        ...(body.yer !== undefined && { yer: body.yer }),
        ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
        ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
        ...(body.telefon !== undefined && { telefon: body.telefon }),
        ...(body.durum !== undefined && { durum: body.durum }),
        ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
        ...(body.tamamlanmaAt !== undefined && { tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null }),
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

    await prisma.service.update({
      where: { id: params.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

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

