import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
  if (!auth.ok) return auth.response;

  try {
    const servisler = await prisma.service.findMany({
      where: {
        deletedAt: null,
        yer: { not: '' },
      },
      select: { yer: true },
      distinct: ['yer'],
      orderBy: { yer: 'asc' },
    });

    const lokasyonlar = servisler
      .map((s) => s.yer)
      .filter((l): l is string => l !== null && l.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'tr'));

    const lokasyonSayilari = await Promise.all(
      lokasyonlar.map(async (lokasyon) => {
        const sayi = await prisma.service.count({
          where: {
            yer: lokasyon,
            deletedAt: null,
          },
        });
        return { lokasyon, sayi };
      })
    );

    return NextResponse.json(lokasyonSayilari);
  } catch (error) {
    console.error('Konumlar API error:', error);
    return NextResponse.json({ error: 'Konumlar yüklenirken hata oluştu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { lokasyon } = body;

    if (!lokasyon || typeof lokasyon !== 'string' || lokasyon.trim() === '') {
      return NextResponse.json({ error: 'Geçerli bir konum adı gerekli' }, { status: 400 });
    }

    const trimmedLokasyon = lokasyon.trim();

    const mevcut = await prisma.service.findFirst({
      where: { yer: trimmedLokasyon },
    });

    if (mevcut) {
      return NextResponse.json(
        { error: 'Bu konum zaten mevcut', lokasyon: trimmedLokasyon },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: 'Konum bilgisi kaydedildi. Yeni servis kaydında kullanılabilir.',
      lokasyon: trimmedLokasyon,
    });
  } catch (error) {
    console.error('Konum ekleme hatası:', error);
    return NextResponse.json({ error: 'Konum eklenirken hata oluştu' }, { status: 500 });
  }
}

