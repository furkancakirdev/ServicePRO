/**
 * Servis Zorluk Seviyesi API
 * Endpoint: /api/servis/[id]/zorluk-seviyesi
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { checkYetkiliAccess } from '@/lib/utils/yetkili-whitelist';

interface RouteParams {
  params: { id: string };
}

// PUT: Servis zorluk seviyesini guncelle
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const userId = auth.payload.userId;
    const { id } = params;

    const isYetkili = await checkYetkiliAccess(userId);
    if (!isYetkili) {
      return NextResponse.json(
        { success: false, error: 'Bu islem icin yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { zorlukSeviyesi } = body;

    const gecerliSeviyeler = ['RUTIN', 'ARIZA', 'PROJE'];
    if (zorlukSeviyesi && !gecerliSeviyeler.includes(zorlukSeviyesi)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gecersiz zorluk seviyesi. Gecerli degerler: RUTIN, ARIZA, PROJE',
        },
        { status: 400 }
      );
    }

    const servis = await prisma.service.findUnique({
      where: { id },
      include: {
        tekne: { select: { ad: true } },
      },
    });

    if (!servis) {
      return NextResponse.json(
        { success: false, error: 'Servis bulunamadi' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const updated = await prisma.service.update({
      where: { id },
      data: { zorlukSeviyesi: zorlukSeviyesi || null },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: updated.id,
        detay: `Servis zorluk seviyesi guncellendi: ${servis.tekneAdi} -> ${zorlukSeviyesi || 'Otomatik'}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        zorlukSeviyesi: updated.zorlukSeviyesi,
        mesaj: updated.zorlukSeviyesi
          ? `Zorluk seviyesi manuel olarak ${zorlukSeviyesi} olarak ayarlandi`
          : 'Zorluk seviyesi otomatik (is turune gore) ayarlandi',
      },
    });
  } catch (error) {
    console.error('Servis zorluk seviyesi guncelleme hatasi:', error);
    return NextResponse.json(
      { success: false, error: 'Guncelleme basarisiz' },
      { status: 500 }
    );
  }
}

// GET: Servis zorluk seviyesini getir
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { id } = params;

    const servis = await prisma.service.findUnique({
      where: { id },
      select: {
        id: true,
        isTuru: true,
        zorlukSeviyesi: true,
      },
    });

    if (!servis) {
      return NextResponse.json(
        { success: false, error: 'Servis bulunamadi' },
        { status: 404 }
      );
    }

    let aktifSeviye = servis.zorlukSeviyesi;
    if (!aktifSeviye) {
      switch (servis.isTuru) {
        case 'PAKET':
          aktifSeviye = 'RUTIN';
          break;
        case 'ARIZA':
          aktifSeviye = 'ARIZA';
          break;
        case 'PROJE':
          aktifSeviye = 'PROJE';
          break;
      }
    }

    let carpan = 1.0;
    switch (aktifSeviye) {
      case 'RUTIN':
        carpan = 1.0;
        break;
      case 'ARIZA':
        carpan = 1.2;
        break;
      case 'PROJE':
        carpan = 1.5;
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: servis.id,
        isTuru: servis.isTuru,
        manuelSeviye: servis.zorlukSeviyesi,
        aktifSeviye,
        carpan,
      },
    });
  } catch (error) {
    console.error('Servis zorluk seviyesi hatasi:', error);
    return NextResponse.json(
      { success: false, error: 'Servis bilgileri alinamadi' },
      { status: 500 }
    );
  }
}
