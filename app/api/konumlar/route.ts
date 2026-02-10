import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

// GET - Tüm lokasyonları listele (servis kayıtlarından benzersiz)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    // Servis kayıtlarından benzersiz lokasyonları al
    const servisler = await prisma.service.findMany({
      where: {
        deletedAt: null,
        yer: {
          not: '' as any,
        },
      },
      select: {
        yer: true,
      },
      distinct: ['yer'],
      orderBy: {
        yer: 'asc',
      },
    });

    const lokasyonlar = servisler
      .map((s) => s.yer)
      .filter((l): l is string => l !== null && l.trim() !== '')
      .sort((a, b) => a.localeCompare(b, 'tr'));

    // Her lokasyon için servis sayısını al
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
    return NextResponse.json(
      { error: 'Konumlar yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni lokasyon ekle (gerçekte yeni servis kaydı ile lokasyon eklenir)
// Bu endpoint daha çok referans için var, aslında lokasyonlar servis kayıtlarından türetilir
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { lokasyon } = body;

    if (!lokasyon || typeof lokasyon !== 'string' || lokasyon.trim() === '') {
      return NextResponse.json(
        { error: 'Geçerli bir lokasyon adı gerekli' },
        { status: 400 }
      );
    }

    const trimmedLokasyon = lokasyon.trim();

    // Lokasyon zaten var mı kontrol et
    const mevcut = await prisma.service.findFirst({
      where: {
        yer: trimmedLokasyon,
      },
    });

    if (mevcut) {
      return NextResponse.json(
        { error: 'Bu lokasyon zaten mevcut', lokasyon: trimmedLokasyon },
        { status: 409 }
      );
    }

    // Yeni bir örnek servis kaydı oluştur (lokasyonu eklemek için)
    // Not: Bu sadece referans amaçlı, gerçek kullanımda servis kaydı ile lokasyon eklenir
    return NextResponse.json({
      message: 'Lokasyon bilgisi alındı. Servis kaydı oluşturulduğunda bu lokasyon kullanılabilir.',
      lokasyon: trimmedLokasyon,
    });
  } catch (error) {
    console.error('Konum ekleme hatası:', error);
    return NextResponse.json(
      { error: 'Konum eklenirken hata oluştu' },
      { status: 500 }
    );
  }
}
