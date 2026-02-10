// ServicePro - Servis Kapanış Puanlama API
// Bu API, servis "TAMAMLANDI" durumuna geçtiğinde personel puanlamalarını kaydeder

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { IS_TURU_CONFIG } from '@/types';
import { requireAuth } from '@/lib/auth/api-auth';
import { hesaplaBireyselPuanWithCarpan } from '@/lib/scoring-calculator';
// Rapor başarısı hesaplama (eksiklik kontrolü)
function hesaplaRaporBasarisi(
    raporKontrol: {
        seriNoVar: boolean;
        fotografVar: boolean;
        aciklamaVar: boolean;
        saatVar: boolean;
    },
    isTuru: string
): number {
    let kazanilan = 0;
    let toplamMumkun = 0;

    // Temel kriterler (her işte var)
    toplamMumkun += 20; if (raporKontrol.seriNoVar) kazanilan += 20;
    toplamMumkun += 20; if (raporKontrol.fotografVar) kazanilan += 20;
    toplamMumkun += 20; if (raporKontrol.aciklamaVar) kazanilan += 20;

    // Saat yalnızca PAKET dışında değerlendiriliyor
    if (isTuru !== 'PAKET') {
        toplamMumkun += 20;
        if (raporKontrol.saatVar) kazanilan += 20;
    }

    return toplamMumkun > 0 ? kazanilan / toplamMumkun : 1;
}

const servisKapanisRequestSchema = z.object({
    servisId: z.string().min(1),
    personeller: z.array(
        z.object({
            personelId: z.string().min(1),
            rol: z.enum(['SORUMLU', 'DESTEK']),
            bonus: z.boolean(),
        })
    ).min(1).refine(
        (list) => new Set(list.map((item) => item.personelId)).size === list.length,
        { message: 'Aynı personel birden fazla kez gönderilemez' }
    ),
    raporKontrol: z.object({
        seriNoVar: z.boolean(),
        fotografVar: z.boolean(),
        aciklamaVar: z.boolean(),
        saatVar: z.boolean(),
    }),
});

export type ServisKapanisRequest = z.infer<typeof servisKapanisRequestSchema>;

// POST: Servis kapanış puanlaması kaydet
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const rawBody = await request.json();
        const parsed = servisKapanisRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Geçersiz istek verisi',
                        details: parsed.error.flatten(),
                    },
                },
                { status: 400 }
            );
        }
        const { servisId, personeller, raporKontrol }: ServisKapanisRequest = parsed.data;

        // Servis bilgisini al
        const servis = await prisma.service.findUnique({
            where: { id: servisId },
            include: {
                personeller: {
                    include: {
                        personel: true,
                    },
                },
            },
        });

        if (!servis) {
            return NextResponse.json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Servis bulunamadı' } },
                { status: 404 }
            );
        }

        // Zorluk katsayısını veritabanından al (güncel değer)
        const zorlukKatsayiRecord = await prisma.zorlukKatsayi.findUnique({
            where: { isTuru: servis.isTuru },
        });

        // Eğer veritabanında yoksa varsayılan değerleri kullan
        const zorlukCarpani = zorlukKatsayiRecord?.carpan ?? IS_TURU_CONFIG[servis.isTuru]?.carpan ?? 1.0;

        // Rapor başarısını hesapla
        const raporBasarisi = hesaplaRaporBasarisi(raporKontrol, servis.isTuru);

        // Her personel için puan hesapla ve kaydet
        const puanKayitlari = [];

        for (const personelData of personeller) {
            // Personel bilgisini al
            const personel = await prisma.personel.findUnique({
                where: { id: personelData.personelId },
            });

            if (!personel) {
                continue; // Personel bulunamazsa atla
            }

            // Puan hesapla
            const { hamPuan, finalPuan } = hesaplaBireyselPuanWithCarpan(
                raporBasarisi,
                zorlukCarpani,
                personelData.rol === 'SORUMLU' ? 'sorumlu' : 'destek',
                personelData.bonus
            );

            // ServisPuan kaydı oluştur
            await prisma.servisPuan.create({
                data: {
                    servisId,
                    personelId: personelData.personelId,
                    personelAd: personel.ad,
                    rol: personelData.rol,
                    isTuru: servis.isTuru,
                    seriNoVar: raporKontrol.seriNoVar,
                    fotografVar: raporKontrol.fotografVar,
                    aciklamaVar: raporKontrol.aciklamaVar,
                    saatVar: raporKontrol.saatVar,
                    raporBasarisi,
                    hamPuan,
                    zorlukCarpani,
                    finalPuan,
                    bonus: personelData.bonus,
                    notlar: `İş Türü: ${servis.isTuru}, Zorluk Çarpanı: ${zorlukCarpani}x`,
                },
            });

            puanKayitlari.push({
                personelId: personelData.personelId,
                personelAd: personel.ad,
                rol: personelData.rol,
                hamPuan,
                zorlukCarpani,
                finalPuan,
                bonus: personelData.bonus,
            });
        }

        if (puanKayitlari.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Geçerli personel bulunamadı',
                    },
                },
                { status: 400 }
            );
        }

        // Servisi "TAMAMLANDI" durumuna güncelle
        await prisma.service.update({
            where: { id: servisId },
            data: {
                durum: 'TAMAMLANDI',
                tamamlanmaAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                servisId,
                isTuru: servis.isTuru,
                zorlukCarpani,
                raporBasarisi: Math.round(raporBasarisi * 100),
                puanlar: puanKayitlari,
            },
            meta: {
                kayitSayisi: puanKayitlari.length,
                tarih: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Servis kapanış puanlama hatası:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Puanlama kaydedilemedi',
                    details: error instanceof Error ? error.message : 'Bilinmeyen hata'
                }
            },
            { status: 500 }
        );
    }
}



