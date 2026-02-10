/**
 * Admin API - Rapor Kontrol Soruları Yönetimi
 *
 * Admin tarafından dinamik rapor kontrol sorularını yönetmek için endpoint.
 * Sorular eklenebilir, düzenlenebilir, silinebilir (soft delete).
 *
 * Endpoint: /api/admin/rapor-kontrol-sorular
 * Methods: GET, POST, PUT, DELETE
 *
 * Sadece whitelisted yetkililer erişebilir.
 */

import { NextRequest, NextResponse } from 'next/server';
import { IsTuru, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { checkYetkiliAccess } from '@/lib/utils/yetkili-whitelist';

// GET: Rapor kontrol sorularını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raporKontrolMu = searchParams.get('raporKontrolMu'); // true/false
    const isTuru = searchParams.get('isTuru'); // PAKET, ARIZA, PROJE

    // Yetki kontrolü - sadece yetkililer görebilir
    const auth = await requireAuth(request);
    if (auth.ok) {
      const isYetkili = await checkYetkiliAccess(auth.payload.userId);
      if (!isYetkili) {
        // Yetkisiz kullanıcılar sadece aktif soruları görebilir.
      }
    }

    const where: Prisma.PuanlamaSoruWhereInput = { aktif: true };

    // Sadece rapor kontrol soruları mı?
    if (raporKontrolMu === 'true') {
      where.raporKontrolMu = true;
    }

    // İş türü filtresi
    if (isTuru && isTuru !== 'ALL') {
      const isTuruEnum = (Object.values(IsTuru) as string[]).includes(isTuru)
        ? (isTuru as IsTuru)
        : null;

      if (isTuruEnum) {
        where.OR = [
          { isTuruFilter: null }, // Tum is turlerinde gecerli
          { isTuruFilter: isTuruEnum }, // Bu is turunde gecerli
        ];
      }
    }

    const sorular = await prisma.puanlamaSoru.findMany({
      where,
      orderBy: [{ sira: 'asc' }, { kategori: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: sorular.map((s) => ({
        id: s.id,
        key: s.key,
        label: s.label,
        aciklama: s.aciklama,
        kategori: s.kategori,
        raporKontrolMu: s.raporKontrolMu,
        isTuruFilter: s.isTuruFilter,
        zorunluMu: s.zorunluMu,
        aktif: s.aktif,
        sira: s.sira,
        agirlik: s.agirlik,
      })),
    });
  } catch (error) {
    console.error('Rapor kontrol soruları hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Sorular alınamadı' },
      { status: 500 }
    );
  }
}

// POST: Yeni rapor kontrol sorusu ekle
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;
    const userId = auth.payload.userId;

    // Whitelist kontrolü - sadece yetkili adminler ekleyebilir
    const isYetkili = await checkYetkiliAccess(userId);
    if (!isYetkili) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      key,
      label,
      aciklama,
      kategori,
      raporKontrolMu = true,
      isTuruFilter,
      zorunluMu = true,
      agirlik = 1.0,
    } = body;

    // Validasyon
    if (!key || !label) {
      return NextResponse.json(
        { success: false, error: 'Key ve label gerekli' },
        { status: 400 }
      );
    }

    // Key zaten var mı kontrol et
    const mevcut = await prisma.puanlamaSoru.findUnique({
      where: { key },
    });

    if (mevcut) {
      return NextResponse.json(
        { success: false, error: 'Bu key zaten kullanımda' },
        { status: 400 }
      );
    }

    // Son sıra numarasını bul
    const sonSira = await prisma.puanlamaSoru.findFirst({
      where: { kategori },
      orderBy: { sira: 'desc' },
    });

    // Kullanıcı bilgisini al
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Yeni soru oluştur
    const yeniSoru = await prisma.puanlamaSoru.create({
      data: {
        key,
        label,
        aciklama,
        kategori: kategori || 'GENEL',
        raporKontrolMu,
        isTuruFilter,
        zorunluMu,
        agirlik,
        sira: (sonSira?.sira ?? 0) + 1,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        islemTuru: 'CREATE',
        entityTipi: 'PuanlamaSoru',
        entityId: yeniSoru.id,
        detay: `Yeni rapor kontrol sorusu eklendi: ${label}`,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: yeniSoru.id,
          key: yeniSoru.key,
          label: yeniSoru.label,
          aciklama: yeniSoru.aciklama,
          kategori: yeniSoru.kategori,
          raporKontrolMu: yeniSoru.raporKontrolMu,
          isTuruFilter: yeniSoru.isTuruFilter,
          zorunluMu: yeniSoru.zorunluMu,
          sira: yeniSoru.sira,
          agirlik: yeniSoru.agirlik,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Rapor kontrol sorusu ekleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Soru eklenemedi' },
      { status: 500 }
    );
  }
}

// PUT: Rapor kontrol sorusunu güncelle
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;
    const userId = auth.payload.userId;

    // Whitelist kontrolü
    const isYetkili = await checkYetkiliAccess(userId);
    if (!isYetkili) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, label, aciklama, kategori, raporKontrolMu, isTuruFilter, zorunluMu, agirlik, sira, aktif } =
      body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Soru ID gerekli' },
        { status: 400 }
      );
    }

    // Kullanıcı bilgisini al
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Güncellenecek alanları hazırla
    const updateData: Prisma.PuanlamaSoruUpdateInput = {};
    if (label !== undefined) updateData.label = label;
    if (aciklama !== undefined) updateData.aciklama = aciklama;
    if (kategori !== undefined) updateData.kategori = kategori;
    if (raporKontrolMu !== undefined) updateData.raporKontrolMu = raporKontrolMu;
    if (isTuruFilter !== undefined) updateData.isTuruFilter = isTuruFilter;
    if (zorunluMu !== undefined) updateData.zorunluMu = zorunluMu;
    if (agirlik !== undefined) updateData.agirlik = agirlik;
    if (sira !== undefined) updateData.sira = sira;
    if (aktif !== undefined) updateData.aktif = aktif;

    const updated = await prisma.puanlamaSoru.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        islemTuru: 'UPDATE',
        entityTipi: 'PuanlamaSoru',
        entityId: updated.id,
        detay: `Rapor kontrol sorusu güncellendi: ${updated.label}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        key: updated.key,
        label: updated.label,
        aciklama: updated.aciklama,
        kategori: updated.kategori,
        raporKontrolMu: updated.raporKontrolMu,
        isTuruFilter: updated.isTuruFilter,
        zorunluMu: updated.zorunluMu,
        sira: updated.sira,
        agirlik: updated.agirlik,
        aktif: updated.aktif,
      },
    });
  } catch (error) {
    console.error('Rapor kontrol sorusu güncelleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Güncelleme başarısız' },
      { status: 500 }
    );
  }
}

// DELETE: Rapor kontrol sorusunu sil (soft delete - aktif = false)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;
    const userId = auth.payload.userId;

    // Whitelist kontrolü
    const isYetkili = await checkYetkiliAccess(userId);
    if (!isYetkili) {
      return NextResponse.json(
        { success: false, error: 'Bu işlem için yetkiniz yok' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Soru ID gerekli' },
        { status: 400 }
      );
    }

    // Kullanıcı bilgisini al
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Soft delete - aktif = false
    const deleted = await prisma.puanlamaSoru.update({
      where: { id },
      data: { aktif: false },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail: user?.email,
        islemTuru: 'DELETE',
        entityTipi: 'PuanlamaSoru',
        entityId: deleted.id,
        detay: `Rapor kontrol sorusu silindi: ${deleted.label}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Soru başarıyla silindi',
    });
  } catch (error) {
    console.error('Rapor kontrol sorusu silme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'Silme başarısız' },
      { status: 500 }
    );
  }
}

