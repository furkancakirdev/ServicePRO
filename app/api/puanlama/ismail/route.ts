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
      return NextResponse.json({ error: 'Gecersiz ay formati. Beklenen: YYYY-MM' }, { status: 400 });
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
    return NextResponse.json({ error: 'Ismail degerlendirmeleri alinamadi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz istek verisi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personelId, ay, puan, notlar } = parsed.data;

    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, ad: true },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadi' }, { status: 404 });
    }

    const existing = await prisma.ismailDegerlendirme.findUnique({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      select: { kilitlendi: true },
    });

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
      kilitlendi: saved.kilitlendi,
    });
  } catch (error) {
    console.error('POST /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'Ismail degerlendirmesi kaydedilemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
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

    const result = await prisma.ismailDegerlendirme.deleteMany({
      where: { personnelId: personelId, ay },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Silinecek kayit bulunamadi' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ismail usta degerlendirmesi basariyla silindi',
    });
  } catch (error) {
    console.error('DELETE /api/puanlama/ismail error:', error);
    return NextResponse.json({ error: 'Degerlendirme silinemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const parsed = lockPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz kilitleme istegi', details: parsed.error.flatten() },
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
    return NextResponse.json({ error: 'Kilitleme islemi basarisiz' }, { status: 500 });
  }
}
