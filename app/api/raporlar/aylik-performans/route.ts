// ServicePro - Aylık Performans Raporu API
// Personel bazlı aylık performans verileri ve sıralamaları

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Aylık performans raporu
// Query params: ?ay=2026-02&lokasyon=YATMARIN|NETSEL|DIS_SERVIS
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ay = searchParams.get('ay'); // YYYY-MM formatı
        const lokasyon = searchParams.get('lokasyon');

        // Ay parametresi yoksa bu ayı kullan
        const hedefAy = ay || new Date().toISOString().slice(0, 7);
        const [yil, ayNo] = hedefAy.split('-').map(Number);

        // Ayın başlangıç ve bitiş tarihleri
        const baslangic = new Date(yil, ayNo - 1, 1);
        const bitis = new Date(yil, ayNo, 0, 23, 59, 59);

        // Lokasyon filtresi için where koşulu
        const normalizedLokasyon = (lokasyon || '').toUpperCase();
        const lokasyonFiltresi = normalizedLokasyon && normalizedLokasyon !== 'ALL'
            ? normalizedLokasyon === 'DIS_SERVIS'
                ? {
                    NOT: {
                        OR: [
                            { yer: { contains: 'yatmarin', mode: 'insensitive' as const } },
                            { adres: { contains: 'yatmarin', mode: 'insensitive' as const } },
                            { yer: { contains: 'netsel', mode: 'insensitive' as const } },
                            { adres: { contains: 'netsel', mode: 'insensitive' as const } },
                        ],
                    },
                }
                : {
                    OR: [
                        { yer: { contains: normalizedLokasyon, mode: 'insensitive' as const } },
                        { adres: { contains: normalizedLokasyon, mode: 'insensitive' as const } },
                    ],
                }
            : {};

        // Bu aydaki tüm servis puanlarını çek
        const puanlar = await prisma.servisPuan.findMany({
            where: {
                tarih: {
                    gte: baslangic,
                    lte: bitis,
                },
                servis: lokasyonFiltresi,
            },
            include: {
                personel: true,
                servis: {
                    select: {
                        id: true,
                        tekneAdi: true,
                        yer: true,
                        adres: true,
                        isTuru: true,
                    },
                },
            },
        });

        // Personel bazlı gruplama
        const personelMap = new Map<string, {
            personelId: string;
            personelAd: string;
            unvan: string;
            servisSayisi: number;
            sorumluServis: number;
            destekServis: number;
            toplamPuan: number;
            bonusSayisi: number;
        }>();

        for (const puan of puanlar) {
            const existing = personelMap.get(puan.personelId) || {
                personelId: puan.personelId,
                personelAd: puan.personelAd,
                unvan: puan.personel?.unvan || 'CIRAK',
                servisSayisi: 0,
                sorumluServis: 0,
                destekServis: 0,
                toplamPuan: 0,
                bonusSayisi: 0,
            };

            existing.servisSayisi++;
            existing.toplamPuan += puan.finalPuan;
            if (puan.bonus) existing.bonusSayisi++;
            if (puan.rol === 'SORUMLU') {
                existing.sorumluServis++;
            } else {
                existing.destekServis++;
            }

            personelMap.set(puan.personelId, existing);
        }

        // Listeye çevir ve sırala
        const performansListesi = Array.from(personelMap.values())
            .map((p) => ({
                ...p,
                ortalamaFinalPuan: p.servisSayisi > 0 ? Math.round(p.toplamPuan / p.servisSayisi) : 0,
            }))
            .sort((a, b) => b.ortalamaFinalPuan - a.ortalamaFinalPuan);

        // Sıralama ve rozet atama
        const sonuc = performansListesi.map((p, index) => {
            let rozet: string | null = null;
            if (index === 0) rozet = 'ALTIN';
            else if (index === 1) rozet = 'GUMUS';
            else if (index === 2) rozet = 'BRONZ';

            return {
                ...p,
                siralama: index + 1,
                rozet,
            };
        });

        return NextResponse.json({
            success: true,
            data: sonuc,
            meta: {
                ay: hedefAy,
                lokasyon: normalizedLokasyon && normalizedLokasyon !== 'ALL'
                    ? normalizedLokasyon
                    : 'ALL',
                personelSayisi: sonuc.length,
                toplamServis: puanlar.length,
            },
        });
    } catch (error) {
        console.error('Aylık performans raporu hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Rapor oluşturulamadı' } },
            { status: 500 }
        );
    }
}

