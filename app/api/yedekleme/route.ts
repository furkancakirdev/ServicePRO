import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

// GET - Yedekleme geçmişini listele
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    // Basit bir yedekleme geçmişi simülasyonu
    // Gerçek uygulamada bu veriler veritabanında veya dosya sisteminde saklanır
    const yedekler = [
      {
        id: '1',
        tarih: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        tur: 'manuel',
        boyut: '2.4 MB',
        durum: 'tamamlandı',
        kayitSayisi: 1250,
      },
      {
        id: '2',
        tarih: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        tur: 'otomatik',
        boyut: '2.3 MB',
        durum: 'tamamlandı',
        kayitSayisi: 1245,
      },
      {
        id: '3',
        tarih: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        tur: 'manuel',
        boyut: '2.2 MB',
        durum: 'tamamlandı',
        kayitSayisi: 1238,
      },
    ];

    return NextResponse.json(yedekler);
  } catch (error) {
    console.error('Yedekleme listesi hatası:', error);
    return NextResponse.json(
      { error: 'Yedekleme geçmişi yüklenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Yeni yedekleme başlat
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { tur } = body;

    // Veritabanındaki tablo sayılarını al
    const [
      servisSayisi,
      tekneSayisi,
      personelSayisi,
      kullaniciSayisi,
      degerlendirmeSayisi,
    ] = await Promise.all([
      prisma.service.count({ where: { deletedAt: null } }),
      prisma.tekne.count(),
      prisma.personel.count(),
      prisma.user.count(),
      prisma.yetkiliDegerlendirmeUsta.count(),
    ]);

    // Yedekleme simülasyonu (gerçek uygulamada pg_dump veya benzeri kullanılır)
    const yedek = {
      id: Date.now().toString(),
      tarih: new Date().toISOString(),
      tur: tur || 'manuel',
      boyut: '~',
      durum: 'tamamlandı',
      kayitSayisi: servisSayisi + tekneSayisi + personelSayisi + kullaniciSayisi + degerlendirmeSayisi,
      detay: {
        servis: servisSayisi,
        tekne: tekneSayisi,
        personel: personelSayisi,
        kullanici: kullaniciSayisi,
        degerlendirme: degerlendirmeSayisi,
      },
    };

    return NextResponse.json(yedek);
  } catch (error) {
    console.error('Yedekleme hatası:', error);
    return NextResponse.json(
      { error: 'Yedekleme sırasında hata oluştu' },
      { status: 500 }
    );
  }
}
