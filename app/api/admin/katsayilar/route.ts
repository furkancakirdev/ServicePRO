// ServicePro - Admin Zorluk Katsayıları API
// İş türü bazlı zorluk çarpanlarını yönetir.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

// GET: Tüm katsayıları listele
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const katsayilar = await prisma.zorlukKatsayi.findMany({
      orderBy: { isTuru: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: katsayilar,
    });
  } catch (error) {
    console.error('Katsayı listesi hatası:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Katsayılar alınamadı' } },
      { status: 500 }
    );
  }
}

// PUT: Katsayı güncelle (geçmişe log kaydet)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { isTuru, carpan, degistirenId } = body;

    if (!isTuru || carpan === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'isTuru ve carpan zorunludur' } },
        { status: 400 }
      );
    }

    const mevcutKatsayi = await prisma.zorlukKatsayi.findUnique({
      where: { isTuru },
    });

    if (!mevcutKatsayi) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Katsayı bulunamadı' } },
        { status: 404 }
      );
    }

    if (mevcutKatsayi.carpan !== carpan) {
      await prisma.katsayiGecmisi.create({
        data: {
          isTuru,
          eskiCarpan: mevcutKatsayi.carpan,
          yeniCarpan: carpan,
          degistirenId: degistirenId || 'system',
        },
      });
    }

    const guncellenenKatsayi = await prisma.zorlukKatsayi.update({
      where: { isTuru },
      data: {
        carpan,
        gecerliTarih: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: guncellenenKatsayi,
      message: 'Katsayı güncellendi. Geçmiş puanlar etkilenmeyecek.',
    });
  } catch (error) {
    console.error('Katsayı güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Katsayı güncellenemedi' } },
      { status: 500 }
    );
  }
}
