import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

const responseEnum = z.enum(['EVET', 'KISMEN', 'HAYIR', 'ATLA']);

const payloadSchema = z.object({
  personelId: z.string().min(1),
  ay: z.string().regex(/^\d{4}-\d{2}$/),
  cevaplar: z.record(z.string(), responseEnum),
  notlar: z.string().max(2000).optional(),
  forceOverwrite: z.boolean().optional(),
});

const lockPayloadSchema = z.object({
  ay: z.string().regex(/^\d{4}-\d{2}$/),
  lock: z.boolean(),
  hedef: z.enum(['USTA', 'CIRAK', 'ALL']).optional(),
});

function toScore(value: 'EVET' | 'KISMEN' | 'HAYIR' | 'ATLA' | undefined): number | null {
  if (!value || value === 'ATLA') return null;
  if (value === 'EVET') return 100;
  if (value === 'KISMEN') return 60;
  return 0;
}

function average(values: Array<number | null>): number {
  const filtered = values.filter((v): v is number => typeof v === 'number');
  if (filtered.length === 0) return 0;
  return Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length);
}

function canManageByOwner(params: {
  isAdmin: boolean;
  currentUserId: string;
  ownerYetkiliId?: string | null;
}): boolean {
  if (params.isAdmin) return true;
  return Boolean(params.ownerYetkiliId && params.ownerYetkiliId === params.currentUserId);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const ay = searchParams.get('ay');

    if (!ay || !/^\d{4}-\d{2}$/.test(ay)) {
      return NextResponse.json({ error: 'Gecersiz ay formati. Beklenen: YYYY-MM' }, { status: 400 });
    }

    const [ustalar, ciraklar] = await Promise.all([
      prisma.yetkiliDegerlendirmeUsta.findMany({
        where: { ay },
        select: {
          personnelId: true,
          personnelAd: true,
          uniformaVeIsg: true,
          musteriIletisimi: true,
          planlamaKoordinasyon: true,
          teknikTespit: true,
          raporDokumantasyon: true,
          genelLiderlik: true,
          toplamPuan: true,
          kilitlendi: true,
          yetkiliId: true,
          updatedAt: true,
        },
      }),
      prisma.yetkiliDegerlendirmeCirak.findMany({
        where: { ay },
        select: {
          personnelId: true,
          personnelAd: true,
          uniformaVeIsg: true,
          ekipIciDavranis: true,
          destekKalitesi: true,
          ogrenmeGelisim: true,
          toplamPuan: true,
          kilitlendi: true,
          yetkiliId: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ay,
      items: [
        ...ustalar.map((record) => ({
          tip: 'USTA' as const,
          personelId: record.personnelId,
          personelAd: record.personnelAd,
          yetkiliId: record.yetkiliId,
          cevaplar: {
            uniformaVeIsg: record.uniformaVeIsg,
            musteriIletisimi: record.musteriIletisimi,
            planlamaKoordinasyon: record.planlamaKoordinasyon,
            teknikTespit: record.teknikTespit,
            raporDokumantasyon: record.raporDokumantasyon,
            genelLiderlik: record.genelLiderlik,
          },
          toplamPuan: Math.round(record.toplamPuan),
          kilitlendi: Boolean(record.kilitlendi),
          updatedAt: record.updatedAt,
        })),
        ...ciraklar.map((record) => ({
          tip: 'CIRAK' as const,
          personelId: record.personnelId,
          personelAd: record.personnelAd,
          yetkiliId: record.yetkiliId,
          cevaplar: {
            uniformaVeIsg: record.uniformaVeIsg,
            ekipIciDavranis: record.ekipIciDavranis,
            destekKalitesi: record.destekKalitesi,
            ogrenmeGelisim: record.ogrenmeGelisim,
          },
          toplamPuan: Math.round(record.toplamPuan),
          kilitlendi: Boolean(record.kilitlendi),
          updatedAt: record.updatedAt,
        })),
      ],
    });
  } catch (error) {
    console.error('GET /api/puanlama/yetkili error:', error);
    return NextResponse.json({ error: 'Yetkili degerlendirmeleri alinamadi' }, { status: 500 });
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

    const { personelId, ay, cevaplar, notlar } = parsed.data;
    const isAdmin = auth.payload.role === 'ADMIN';

    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, ad: true, unvan: true },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadi' }, { status: 404 });
    }

    if (personel.unvan === 'USTA') {
      const existing = await prisma.yetkiliDegerlendirmeUsta.findUnique({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        select: { kilitlendi: true, yetkiliId: true },
      });

      if (
        existing &&
        !canManageByOwner({
          isAdmin,
          currentUserId: auth.payload.userId,
          ownerYetkiliId: existing.yetkiliId,
        })
      ) {
        return NextResponse.json(
          { error: 'Bu kaydi sadece olusturan yetkili veya admin duzenleyebilir.' },
          { status: 403 }
        );
      }

      const scores = {
        uniformaVeIsg: toScore(cevaplar.uniformaVeIsg),
        musteriIletisimi: toScore(cevaplar.musteriIletisimi),
        planlamaKoordinasyon: toScore(cevaplar.planlamaKoordinasyon),
        teknikTespit: toScore(cevaplar.teknikTespit),
        raporDokumantasyon: toScore(cevaplar.raporDokumantasyon),
        genelLiderlik: toScore(cevaplar.genelLiderlik),
      };

      const toplamPuan = average(Object.values(scores));
      const ownerYetkiliId = existing?.yetkiliId ?? auth.payload.userId;

      const saved = await prisma.yetkiliDegerlendirmeUsta.upsert({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        update: {
          ...scores,
          toplamPuan,
          notlar: notlar ?? null,
          yetkiliId: ownerYetkiliId,
          kilitlendi: existing?.kilitlendi ?? false,
        },
        create: {
          personnelId: personelId,
          personnelAd: personel.ad,
          ay,
          yetkiliId: auth.payload.userId,
          ...scores,
          toplamPuan,
          notlar: notlar ?? null,
          kilitlendi: false,
        },
      });

      return NextResponse.json({
        success: true,
        tip: 'USTA',
        personelId,
        yetkiliId: saved.yetkiliId,
        toplamPuan: Math.round(saved.toplamPuan),
      });
    }

    const existing = await prisma.yetkiliDegerlendirmeCirak.findUnique({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      select: { kilitlendi: true, yetkiliId: true },
    });

    if (
      existing &&
      !canManageByOwner({
        isAdmin,
        currentUserId: auth.payload.userId,
        ownerYetkiliId: existing.yetkiliId,
      })
    ) {
      return NextResponse.json(
        { error: 'Bu kaydi sadece olusturan yetkili veya admin duzenleyebilir.' },
        { status: 403 }
      );
    }

    const scores = {
      uniformaVeIsg: toScore(cevaplar.uniformaVeIsg),
      ekipIciDavranis: toScore(cevaplar.ekipIciDavranis),
      destekKalitesi: toScore(cevaplar.destekKalitesi),
      ogrenmeGelisim: toScore(cevaplar.ogrenmeGelisim),
    };
    const toplamPuan = average(Object.values(scores));
    const ownerYetkiliId = existing?.yetkiliId ?? auth.payload.userId;

    const saved = await prisma.yetkiliDegerlendirmeCirak.upsert({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      update: {
        ...scores,
        toplamPuan,
        notlar: notlar ?? null,
        yetkiliId: ownerYetkiliId,
        kilitlendi: existing?.kilitlendi ?? false,
      },
      create: {
        personnelId: personelId,
        personnelAd: personel.ad,
        ay,
        yetkiliId: auth.payload.userId,
        ...scores,
        toplamPuan,
        notlar: notlar ?? null,
        kilitlendi: false,
      },
    });

    return NextResponse.json({
      success: true,
      tip: 'CIRAK',
      personelId,
      yetkiliId: saved.yetkiliId,
      toplamPuan: Math.round(saved.toplamPuan),
    });
  } catch (error) {
    console.error('POST /api/puanlama/yetkili error:', error);
    return NextResponse.json({ error: 'Yetkili degerlendirmesi kaydedilemedi' }, { status: 500 });
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

    const isAdmin = auth.payload.role === 'ADMIN';

    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, unvan: true },
    });
    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadi' }, { status: 404 });
    }

    if (personel.unvan === 'USTA') {
      const existing = await prisma.yetkiliDegerlendirmeUsta.findUnique({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        select: { personnelId: true, ay: true, yetkiliId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Silinecek kayit bulunamadi' }, { status: 404 });
      }

      if (
        !canManageByOwner({
          isAdmin,
          currentUserId: auth.payload.userId,
          ownerYetkiliId: existing.yetkiliId,
        })
      ) {
        return NextResponse.json(
          { error: 'Bu kaydi sadece olusturan yetkili veya admin silebilir.' },
          { status: 403 }
        );
      }

      await prisma.yetkiliDegerlendirmeUsta.delete({
        where: { personnelId_ay: { personnelId: personelId, ay } },
      });
    } else {
      const existing = await prisma.yetkiliDegerlendirmeCirak.findUnique({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        select: { personnelId: true, ay: true, yetkiliId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Silinecek kayit bulunamadi' }, { status: 404 });
      }

      if (
        !canManageByOwner({
          isAdmin,
          currentUserId: auth.payload.userId,
          ownerYetkiliId: existing.yetkiliId,
        })
      ) {
        return NextResponse.json(
          { error: 'Bu kaydi sadece olusturan yetkili veya admin silebilir.' },
          { status: 403 }
        );
      }

      await prisma.yetkiliDegerlendirmeCirak.delete({
        where: { personnelId_ay: { personnelId: personelId, ay } },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Degerlendirme basariyla silindi',
    });
  } catch (error) {
    console.error('DELETE /api/puanlama/yetkili error:', error);
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

    const { ay, lock, hedef = 'ALL' } = parsed.data;

    let affectedUsta = 0;
    let affectedCirak = 0;

    if (hedef === 'USTA' || hedef === 'ALL') {
      const result = await prisma.yetkiliDegerlendirmeUsta.updateMany({
        where: { ay },
        data: { kilitlendi: lock },
      });
      affectedUsta = result.count;
    }

    if (hedef === 'CIRAK' || hedef === 'ALL') {
      const result = await prisma.yetkiliDegerlendirmeCirak.updateMany({
        where: { ay },
        data: { kilitlendi: lock },
      });
      affectedCirak = result.count;
    }

    return NextResponse.json({
      success: true,
      ay,
      lock,
      hedef,
      affected: {
        usta: affectedUsta,
        cirak: affectedCirak,
        total: affectedUsta + affectedCirak,
      },
    });
  } catch (error) {
    console.error('PATCH /api/puanlama/yetkili error:', error);
    return NextResponse.json({ error: 'Kilitleme islemi basarisiz' }, { status: 500 });
  }
}
