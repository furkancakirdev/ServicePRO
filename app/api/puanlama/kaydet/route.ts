import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

const cevapDegeriSchema = z.enum(['EVET', 'KISMEN', 'HAYIR']);

const puanlamaRequestSchema = z.object({
    personelId: z.string().min(1),
    cevaplar: z.record(z.string(), cevapDegeriSchema).refine(
        (value) => Object.keys(value).length > 0,
        { message: 'En az bir cevap girilmelidir' }
    ),
    toplamPuan: z.number().min(0).max(100),
    ay: z.string().regex(/^\d{4}-\d{2}$/),
});

type PuanlamaRequest = z.infer<typeof puanlamaRequestSchema>;

// Cevap -> Puan dönüşümü
function cevapToPuan(cevap: 'EVET' | 'KISMEN' | 'HAYIR'): number {
    switch (cevap) {
        case 'EVET': return 100;
        case 'KISMEN': return 60;
        case 'HAYIR': return 0;
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const rawBody = await request.json();
        const parsed = puanlamaRequestSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: 'Geçersiz istek verisi',
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }
        const { personelId, cevaplar, toplamPuan, ay }: PuanlamaRequest = parsed.data;

        // Personel kontrolü
        const personel = await prisma.personel.findUnique({
            where: { id: personelId },
        });

        if (!personel) {
            return NextResponse.json(
                { error: 'Personel bulunamadı' },
                { status: 404 }
            );
        }

        // Personel unvanına göre farklı tabloya kaydet
        if (personel.unvan === 'USTA') {
            const degerlendirme = await prisma.yetkiliDegerlendirmeUsta.upsert({
                where: {
                    personnelId_ay: { personnelId: personelId, ay },
                },
                update: {
                    uniformaVeIsg: cevapToPuan(cevaplar['uniforme'] || cevaplar['isg'] || 'HAYIR'),
                    musteriIletisimi: cevapToPuan(cevaplar['iletisim'] || 'HAYIR'),
                    planlamaKoordinasyon: cevapToPuan(cevaplar['bildirim'] || 'HAYIR'),
                    teknikTespit: cevapToPuan(cevaplar['tespit'] || 'HAYIR'),
                    raporDokumantasyon: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    genelLiderlik: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    toplamPuan,
                },
                create: {
                    personnelId: personelId,
                    personnelAd: personel.ad,
                    ay,
                    yetkiliId: auth.payload.userId,
                    uniformaVeIsg: cevapToPuan(cevaplar['uniforme'] || cevaplar['isg'] || 'HAYIR'),
                    musteriIletisimi: cevapToPuan(cevaplar['iletisim'] || 'HAYIR'),
                    planlamaKoordinasyon: cevapToPuan(cevaplar['bildirim'] || 'HAYIR'),
                    teknikTespit: cevapToPuan(cevaplar['tespit'] || 'HAYIR'),
                    raporDokumantasyon: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    genelLiderlik: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    toplamPuan,
                },
            });

            return NextResponse.json({
                success: true,
                data: degerlendirme,
                type: 'USTA',
            });
        } else {
            const degerlendirme = await prisma.yetkiliDegerlendirmeCirak.upsert({
                where: {
                    personnelId_ay: { personnelId: personelId, ay },
                },
                update: {
                    uniformaVeIsg: cevapToPuan(cevaplar['uniforme'] || cevaplar['isg'] || 'HAYIR'),
                    ekipIciDavranis: cevapToPuan(cevaplar['iletisim'] || 'HAYIR'),
                    destekKalitesi: cevapToPuan(cevaplar['tespit'] || 'HAYIR'),
                    ogrenmeGelisim: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    toplamPuan,
                },
                create: {
                    personnelId: personelId,
                    personnelAd: personel.ad,
                    ay,
                    yetkiliId: auth.payload.userId,
                    uniformaVeIsg: cevapToPuan(cevaplar['uniforme'] || cevaplar['isg'] || 'HAYIR'),
                    ekipIciDavranis: cevapToPuan(cevaplar['iletisim'] || 'HAYIR'),
                    destekKalitesi: cevapToPuan(cevaplar['tespit'] || 'HAYIR'),
                    ogrenmeGelisim: cevapToPuan(cevaplar['genel'] || 'HAYIR'),
                    toplamPuan,
                },
            });

            return NextResponse.json({
                success: true,
                data: degerlendirme,
                type: 'CIRAK',
            });
        }
    } catch (error) {
        console.error('Puanlama kaydedilemedi:', error);
        return NextResponse.json(
            { error: 'Puanlama kaydedilemedi', details: String(error) },
            { status: 500 }
        );
    }
}

