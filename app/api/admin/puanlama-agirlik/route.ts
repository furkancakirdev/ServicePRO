/**
 * Admin API - Puanlama Ağırlıkları Yönetimi
 *
 * Endpoint: /api/admin/puanlama-agirlik
 * Methods: GET, PUT
 *
 * Not: Bu endpoint sadece ADMIN rolüne açıktır.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { checkYetkiliAccess } from '@/lib/utils/yetkili-whitelist';

export const dynamic = 'force-dynamic';

// GET: Tüm puanlama ağırlıklarını getir
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;
    const userId = auth.payload.userId;

    const hasYetkiliAccess = await checkYetkiliAccess(userId);
    if (!hasYetkiliAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için whitelist yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const katsayilar = await prisma.zorlukKatsayi.findMany({
      orderBy: { isTuru: 'asc' },
    });

    const [tabanPuan, performansPuan, yetkiliPuan, ismailPuan] = await Promise.all([
      prisma.setting.findUnique({ where: { anahtar: 'taban_puan_agirlik' } }),
      prisma.setting.findUnique({ where: { anahtar: 'performans_puan_agirlik' } }),
      prisma.setting.findUnique({ where: { anahtar: 'yetkili_puan_agirlik' } }),
      prisma.setting.findUnique({ where: { anahtar: 'ismail_puan_agirlik' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        katsayilar: katsayilar.map((k) => ({
          isTuru: k.isTuru,
          label: k.label,
          carpan: k.carpan,
        })),
        agirliklar: {
          tabanPuan: tabanPuan ? parseFloat(tabanPuan.deger) : 40,
          performansPuan: performansPuan ? parseFloat(performansPuan.deger) : 60,
          yetkiliPuan: yetkiliPuan ? parseFloat(yetkiliPuan.deger) : 35,
          ismailPuan: ismailPuan ? parseFloat(ismailPuan.deger) : 25,
        },
      },
    });
  } catch (error) {
    console.error('Puanlama ağırlıkları hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Ağırlıklar alınamadı' },
      { status: 500 }
    );
  }
}

// PUT: Puanlama ağırlıklarını güncelle
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;
    const userId = auth.payload.userId;

    const hasYetkiliAccess = await checkYetkiliAccess(userId);
    if (!hasYetkiliAccess) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için whitelist yetkisi gereklidir' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { katsayilar, agirliklar } = body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (katsayilar && Array.isArray(katsayilar)) {
      for (const katsayi of katsayilar) {
        const { isTuru, carpan, label } = katsayi;

        const mevcut = await prisma.zorlukKatsayi.findUnique({
          where: { isTuru },
        });

        if (mevcut && mevcut.carpan !== carpan) {
          await prisma.katsayiGecmisi.create({
            data: {
              isTuru,
              eskiCarpan: mevcut.carpan,
              yeniCarpan: carpan,
              degistirenId: userId,
            },
          });
        }

        await prisma.zorlukKatsayi.upsert({
          where: { isTuru },
          update: {
            carpan,
            label: label || mevcut?.label || isTuru,
            gecerliTarih: new Date(),
          },
          create: {
            isTuru,
            carpan,
            label: label || isTuru,
            gecerliTarih: new Date(),
          },
        });
      }
    }

    if (agirliklar) {
      const agirlikKeys = ['tabanPuan', 'performansPuan', 'yetkiliPuan', 'ismailPuan'] as const;

      for (const key of agirlikKeys) {
        const deger = agirliklar[key];
        if (typeof deger === 'number') {
          await prisma.setting.upsert({
            where: { anahtar: `${key}_agirlik` },
            update: {
              deger: deger.toString(),
              guncelleyen: user?.email || 'Sistem',
            },
            create: {
              anahtar: `${key}_agirlik`,
              deger: deger.toString(),
              aciklama: `${key} ağırlık yüzdesi`,
              kategori: 'puanlama',
              guncelleyen: user?.email || 'Sistem',
            },
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        islemTuru: 'UPDATE',
        entityTipi: 'PuanlamaAgirlik',
        detay: 'Puanlama ağırlıkları ve katsayıları güncellendi',
      },
    });

    const updatedKatsayilar = await prisma.zorlukKatsayi.findMany({
      orderBy: { isTuru: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        katsayilar: updatedKatsayilar.map((k) => ({
          isTuru: k.isTuru,
          label: k.label,
          carpan: k.carpan,
        })),
        message: 'Ağırlıklar başarıyla güncellendi',
      },
    });
  } catch (error) {
    console.error('Puanlama ağırlıkları güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Güncelleme başarısız' },
      { status: 500 }
    );
  }
}
