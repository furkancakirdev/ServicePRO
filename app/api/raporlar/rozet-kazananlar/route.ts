// ServicePro - Rozet Kazananlar API
// Aylık ve yıllık rozet kazananları listeler

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: Rozet kazananları
// Query params: ?ay=2026-02 veya ?yil=2026
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ay = searchParams.get('ay'); // YYYY-MM
        const yil = searchParams.get('yil'); // YYYY

        if (ay) {
            // Belirli bir ayın rozet kazananları
            const performanslar = await prisma.aylikPerformans.findMany({
                where: {
                    ay,
                    rozet: { not: null },
                },
                include: {
                    personel: true,
                },
                orderBy: { siralama: 'asc' },
            });

            return NextResponse.json({
                success: true,
                data: performanslar.map((p) => ({
                    personelId: p.personnelId,
                    personelAd: p.personnelAd,
                    rozet: p.rozet,
                    siralama: p.siralama,
                    toplamPuan: p.toplamPuan,
                    servisSayisi: p.servisSayisi,
                })),
                meta: {
                    ay,
                    tip: 'aylik',
                },
            });
        }

        if (yil) {
            // Yıllık klasman
            const aylar = [];
            for (let i = 1; i <= 12; i++) {
                aylar.push(`${yil}-${String(i).padStart(2, '0')}`);
            }

            const performanslar = await prisma.aylikPerformans.findMany({
                where: {
                    ay: { in: aylar },
                    rozet: { not: null },
                },
            });

            // Personel bazlı rozet toplamları
            const personelMap = new Map<string, {
                personnelId: string;
                personnelAd: string;
                altinRozet: number;
                gumusRozet: number;
                bronzRozet: number;
                toplamPuan: number;
            }>();

            for (const p of performanslar) {
                const existing = personelMap.get(p.personnelId) || {
                    personnelId: p.personnelId,
                    personnelAd: p.personnelAd,
                    altinRozet: 0,
                    gumusRozet: 0,
                    bronzRozet: 0,
                    toplamPuan: 0,
                };

                if (p.rozet === 'ALTIN') existing.altinRozet++;
                if (p.rozet === 'GUMUS') existing.gumusRozet++;
                if (p.rozet === 'BRONZ') existing.bronzRozet++;
                existing.toplamPuan += p.toplamPuan;

                personelMap.set(p.personnelId, existing);
            }

            // Sırala: Önce altın, sonra toplam rozet, sonra puan
            const klasman = Array.from(personelMap.values())
                .sort((a, b) => {
                    if (b.altinRozet !== a.altinRozet) return b.altinRozet - a.altinRozet;
                    const aToplam = a.altinRozet + a.gumusRozet + a.bronzRozet;
                    const bToplam = b.altinRozet + b.gumusRozet + b.bronzRozet;
                    if (bToplam !== aToplam) return bToplam - aToplam;
                    return b.toplamPuan - a.toplamPuan;
                })
                .map((p, index) => ({
                    ...p,
                    siralama: index + 1,
                }));

            return NextResponse.json({
                success: true,
                data: klasman,
                meta: {
                    yil,
                    tip: 'yillik',
                    toplamAy: performanslar.length,
                },
            });
        }

        // Parametre yoksa son 3 ayın rozet kazananlarını döndür
        const bugun = new Date();
        const sonUcAy = [];
        for (let i = 0; i < 3; i++) {
            const tarih = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1);
            sonUcAy.push(tarih.toISOString().slice(0, 7));
        }

        const performanslar = await prisma.aylikPerformans.findMany({
            where: {
                ay: { in: sonUcAy },
                rozet: { not: null },
            },
            orderBy: [
                { ay: 'desc' },
                { siralama: 'asc' },
            ],
        });

        // Ay bazlı gruplama
        const aylikGruplu: Record<string, typeof performanslar> = {};
        for (const p of performanslar) {
            if (!aylikGruplu[p.ay]) aylikGruplu[p.ay] = [];
            aylikGruplu[p.ay].push(p);
        }

        return NextResponse.json({
            success: true,
            data: aylikGruplu,
            meta: {
                tip: 'son3ay',
                aylar: sonUcAy,
            },
        });
    } catch (error) {
        console.error('Rozet kazananları hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Rozet listesi alınamadı' } },
            { status: 500 }
        );
    }
}

