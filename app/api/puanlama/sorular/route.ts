// ServicePro - Dinamik Puanlama Soruları API
// Admin tarafından yönetilebilir soru havuzu

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

// GET: Soruları kategoriye göre listele
export async function GET(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const kategori = searchParams.get('kategori'); // USTA, CIRAK, GENEL

        const where = kategori
            ? { kategori: kategori as 'USTA' | 'CIRAK' | 'GENEL', aktif: true }
            : { aktif: true };

        const sorular = await prisma.puanlamaSoru.findMany({
            where,
            orderBy: [
                { kategori: 'asc' },
                { sira: 'asc' },
            ],
        });

        return NextResponse.json({
            success: true,
            data: sorular,
            meta: {
                toplam: sorular.length,
            },
        });
    } catch (error) {
        console.error('Soru listesi hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Sorular alınamadı' } },
            { status: 500 }
        );
    }
}

// POST: Yeni soru ekle (ADMIN only)
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { key, label, aciklama, kategori, agirlik = 1.0 } = body;

        // Validasyon
        if (!key || !label || !aciklama || !kategori) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'key, label, aciklama ve kategori zorunludur' } },
                { status: 400 }
            );
        }

        // Key benzersizlik kontrolü
        const mevcutSoru = await prisma.puanlamaSoru.findUnique({
            where: { key },
        });

        if (mevcutSoru) {
            return NextResponse.json(
                { success: false, error: { code: 'DUPLICATE_KEY', message: 'Bu key zaten kullanılıyor' } },
                { status: 400 }
            );
        }

        // Son sıra numarasını bul
        const sonSoru = await prisma.puanlamaSoru.findFirst({
            where: { kategori },
            orderBy: { sira: 'desc' },
        });

        const yeniSira = (sonSoru?.sira ?? 0) + 1;

        const yeniSoru = await prisma.puanlamaSoru.create({
            data: {
                key,
                label,
                aciklama,
                kategori,
                agirlik,
                sira: yeniSira,
            },
        });

        return NextResponse.json({
            success: true,
            data: yeniSoru,
        }, { status: 201 });
    } catch (error) {
        console.error('Soru ekleme hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Soru eklenemedi' } },
            { status: 500 }
        );
    }
}

// PUT: Soru güncelle (ADMIN only)
export async function PUT(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { id, label, aciklama, agirlik, aktif, sira } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'id zorunludur' } },
                { status: 400 }
            );
        }

        const guncellenenSoru = await prisma.puanlamaSoru.update({
            where: { id },
            data: {
                ...(label !== undefined && { label }),
                ...(aciklama !== undefined && { aciklama }),
                ...(agirlik !== undefined && { agirlik }),
                ...(aktif !== undefined && { aktif }),
                ...(sira !== undefined && { sira }),
            },
        });

        return NextResponse.json({
            success: true,
            data: guncellenenSoru,
        });
    } catch (error) {
        console.error('Soru güncelleme hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Soru güncellenemedi' } },
            { status: 500 }
        );
    }
}

// DELETE: Soru sil (soft delete - aktif: false)
export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: { code: 'VALIDATION_ERROR', message: 'id parametresi zorunludur' } },
                { status: 400 }
            );
        }

        // Soft delete: aktif = false yap
        const silinenSoru = await prisma.puanlamaSoru.update({
            where: { id },
            data: { aktif: false },
        });

        return NextResponse.json({
            success: true,
            data: silinenSoru,
            message: 'Soru pasif yapıldı',
        });
    } catch (error) {
        console.error('Soru silme hatası:', error);
        return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'Soru silinemedi' } },
            { status: 500 }
        );
    }
}

