/**
 * Takvim API - Filtreli Servis Listesi
 *
 * FullCalendar ve takvim bileşenleri için filtreli servis verisi sağlar.
 * Lokasyon, tarih aralığı ve durum bazlı filtreleme destekler.
 *
 * Endpoint: /api/takvim
 * Method: GET
 * Query Params:
 *   - lokasyon: Dış Servis, Netsel, Yatmarin filtresi
 *   - baslangic: Başlangıç tarihi (YYYY-MM-DD)
 *   - bitis: Bitiş tarihi (YYYY-MM-DD)
 *   - durum: Servis durumu filtresi
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ServisDurumu } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizeServisDurumuForApp, normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { createUtcDayRange, toDateOnlyISO } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

// GET: Filtreli takvim verisi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lokasyon = searchParams.get('lokasyon'); // DIS_SERVIS, NETSEL, YATMARIN
    const baslangic = searchParams.get('baslangic'); // YYYY-MM-DD
    const bitis = searchParams.get('bitis'); // YYYY-MM-DD
    const durum = searchParams.get('durum'); // Servis durumu

    // Dinamik where objesi oluştur
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null, // Silinmiş servisleri gösterme
    };

    // Tarih filtresi
    if (baslangic || bitis) {
      where.tarih = {};
      if (baslangic) {
        const range = createUtcDayRange(baslangic);
        if (range) where.tarih.gte = range.start;
      }
      if (bitis) {
        const range = createUtcDayRange(bitis);
        if (range) where.tarih.lte = range.end;
      }
    }

    // Lokasyon filtresi - yer alanında içerme kontrolü
    if (lokasyon && lokasyon !== 'ALL') {
      where.yer = {
        contains: lokasyon,
        mode: 'insensitive',
      };
    }

    // Durum filtresi
    if (durum && durum !== 'ALL') {
      const normalizedDurum = normalizeServisDurumuForDb(durum);
      if ((Object.values(ServisDurumu) as string[]).includes(normalizedDurum)) {
        where.durum = normalizedDurum as ServisDurumu;
      }
    }

    // Servisleri getir
    const servisler = await prisma.service.findMany({
      where,
      include: {
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
        },
        tekne: {
          select: {
            id: true,
            ad: true,
            marka: true,
            model: true,
          },
        },
      },
      orderBy: [{ tarih: 'desc' }, { saat: 'asc' }],
      take: 500, // Maksimum 500 kayıt
    });

    // FullCalendar formatına çevir
    const events = servisler.map((s) => {
      // Zorluk seviyesini belirle
      let zorlukSeviye = s.zorlukSeviyesi;
      if (!zorlukSeviye) {
        switch (s.isTuru) {
          case 'PAKET':
            zorlukSeviye = 'RUTIN';
            break;
          case 'ARIZA':
            zorlukSeviye = 'ARIZA';
            break;
          case 'PROJE':
            zorlukSeviye = 'PROJE';
            break;
        }
      }

      // Çarpan hesapla
      let carpan = 1.0;
      switch (zorlukSeviye) {
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

      // Durum rengi
      const durumApp = normalizeServisDurumuForApp(s.durum);
      const durumRengi = getDurumRengi(durumApp);

      // Lokasyon badge rengi
      const lokasyonRengi = getLokasyonRengi(s.yer);

      return {
        id: s.id,
        title: s.tekneAdi,
        start: toDateOnlyISO(s.tarih) || new Date().toISOString().slice(0, 10),
        backgroundColor: durumRengi,
        borderColor: lokasyonRengi,
        extendedProps: {
          tekneId: s.tekneId,
          tekneAdi: s.tekneAdi,
          durum: durumApp,
          yer: s.yer,
          isTuru: s.isTuru,
          saat: s.saat,
          adres: s.adres,
          zorlukSeviye,
          carpan,
          personel: s.personeller.map((p) => ({
            id: p.personel.id,
            ad: p.personel.ad,
            unvan: p.personel.unvan,
            rol: p.rol,
          })),
          personelAdlari: s.personeller.map((p) => p.personel.ad).join(', '),
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: events,
      meta: {
        toplam: events.length,
        filtreler: {
          lokasyon: lokasyon || 'Tümü',
          baslangic: baslangic || null,
          bitis: bitis || null,
          durum: durum || 'Tümü',
        },
      },
    });
  } catch (error) {
    console.error('Takvim API hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Takvim verileri alınamadı' },
      { status: 500 }
    );
  }
}

// Yardımcı fonksiyon - Durum rengi
function getDurumRengi(durum: string): string {
  const renkler: Record<string, string> = {
    RANDEVU_VERILDI: '#3b82f6', // blue-500
    DEVAM_EDIYOR: '#f59e0b', // amber-500
    PARCA_BEKLIYOR: '#ef4444', // red-500
    MUSTERI_ONAY_BEKLIYOR: '#8b5cf6', // violet-500
    RAPOR_BEKLIYOR: '#ec4899', // pink-500
    KESIF_KONTROL: '#06b6d4', // cyan-500
    TAMAMLANDI: '#22c55e', // green-500
  };
  return renkler[durum] || '#6b7280'; // gray-500
}

// Yardımcı fonksiyon - Lokasyon rengi
function getLokasyonRengi(yer: string): string {
  const yerLower = yer?.toLowerCase() || '';

  if (yerLower.includes('netsel')) {
    return '#22c55e'; // green-500
  } else if (yerLower.includes('yatmarin')) {
    return '#f97316'; // orange-500
  } else if (yerLower.includes('dış') || yerLower.includes('dis')) {
    return '#3b82f6'; // blue-500
  }

  return '#9ca3af'; // gray-400
}




