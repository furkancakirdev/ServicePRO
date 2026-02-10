import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

const payloadSchema = z.object({
  personelId: z.string().min(1),
  ay: z.string().regex(/^\d{4}-\d{2}$/),
  puan: z.number().int().min(1).max(5),
  notlar: z.string().max(2000).optional(),
  forceOverwrite: z.boolean().optional(),
});

const lockPayloadSchema = z.object({
  ay: z.string().regex(/^\d{4}-\d{2}$/),
  lock: z.boolean(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const ay = searchParams.get('ay');

    if (!ay || !/^\d{4}-\d{2}$/.test(ay)) {
      return NextResponse.json({ error: 'Geçersiz ay formatı. Beklenen: YYYY-MM' }, { status: 400 });
    }

    const items = await prisma.ismailDegerlendirme.findMany({
      where: { ay },
      select: {
        personnelId: true,
        personnelAd: true,
        puan: true,
        kilitlendi: true,
        kayitTarihi: true,
      },
      orderBy: { personnelAd: 'asc' },
    });

    return NextResponse.json({ ay, items });
  } catch (error) {
    console.error('GET /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'İsmail değerlendirmeleri alınamadı' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz istek verisi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personelId, ay, puan, notlar, forceOverwrite } = parsed.data;
    const isAdmin = auth.payload.role === 'ADMIN';

    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, ad: true, rol: true },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    const existing = await prisma.ismailDegerlendirme.findUnique({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      select: { kilitlendi: true },
    });

    if (existing?.kilitlendi && !forceOverwrite) {
      return NextResponse.json(
        { error: 'Bu değerlendirme kilitli. Güncelleme için admin overwrite gerekir.' },
        { status: 423 }
      );
    }

    if (existing?.kilitlendi && forceOverwrite && !isAdmin) {
      return NextResponse.json(
        { error: 'Kilitli kaydı sadece admin overwrite edebilir.' },
        { status: 403 }
      );
    }

    const saved = await prisma.ismailDegerlendirme.upsert({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      update: {
        puan,
        notlar: notlar ?? null,
        kayitTarihi: new Date(),
        kilitlendi: existing?.kilitlendi ?? false,
      },
      create: {
        personnelId: personelId,
        personnelAd: personel.ad,
        ay,
        puan,
        notlar: notlar ?? null,
        kilitlendi: false,
      },
    });

    return NextResponse.json({
      success: true,
      personelId,
      personelAd: personel.ad,
      ay,
      puan: saved.puan,
      kayitTarihi: saved.kayitTarihi,
    });
  } catch (error) {
    console.error('POST /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'İsmail değerlendirmesi kaydedilemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const personelId = searchParams.get('personelId');
    const ay = searchParams.get('ay');

    if (!personelId || !ay) {
      return NextResponse.json(
        { error: 'personelId ve ay parametreleri gerekli' },
        { status: 400 }
      );
    }

    const existing = await prisma.ismailDegerlendirme.findUnique({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      select: { kilitlendi: true },
    });

    if (existing?.kilitlendi) {
      return NextResponse.json(
        { error: 'Kilitli değerlendirme silinemez. Önce kilidi açın.' },
        { status: 423 }
      );
    }

    const result = await prisma.ismailDegerlendirme.deleteMany({
      where: { personnelId: personelId, ay },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Silinecek kayıt bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'İsmail usta değerlendirmesi başarıyla silindi',
    });
  } catch (error) {
    console.error('DELETE /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'Değerlendirme silinemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const parsed = lockPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz kilitleme isteği', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ay, lock } = parsed.data;
    const result = await prisma.ismailDegerlendirme.updateMany({
      where: { ay },
      data: { kilitlendi: lock },
    });

    return NextResponse.json({
      success: true,
      ay,
      lock,
      affected: result.count,
    });
  } catch (error) {
    console.error('PATCH /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'Kilitleme işlemi başarısız' }, { status: 500 });
  }
}

