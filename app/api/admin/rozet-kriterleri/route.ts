// ServicePro - Admin Rozet Kriterleri API
// Altın, Gümüş, Bronz rozet kazanma kurallarını yönetir

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

// GET: Rozet kriterlerini listele
export async function GET(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const kriterler = await prisma.rozetKriteri.findMany({
            where: { aktif: true },
            orderBy: { siralama: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: kriterler,
        });
    } catch (error) {
        console.error('Rozet kriterleri hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Rozet kriterleri alınamadı' } },
            { status: 500 }
        );
    }
}

// PUT: Rozet kriterlerini güncelle
export async function PUT(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN']);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { rozet, siralama, aktif } = body;

        if (!rozet) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'rozet zorunludur' } },
                { status: 400 }
            );
        }

        const guncellenenKriter = await prisma.rozetKriteri.update({
            where: { rozet },
            data: {
                ...(siralama !== undefined && { siralama }),
                ...(aktif !== undefined && { aktif }),
            },
        });

        return NextResponse.json({
            success: true,
            data: guncellenenKriter,
        });
    } catch (error) {
        console.error('Rozet kriteri güncelleme hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Rozet kriteri güncellenemedi' } },
            { status: 500 }
        );
    }
}

