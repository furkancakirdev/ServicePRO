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

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const ay = searchParams.get('ay');

    if (!ay || !/^\d{4}-\d{2}$/.test(ay)) {
      return NextResponse.json({ error: 'Geçersiz ay formatı. Beklenen: YYYY-MM' }, { status: 400 });
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
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ay,
      items: [
        ...ustalar.map((r) => ({
          tip: 'USTA' as const,
          personelId: r.personnelId,
          personelAd: r.personnelAd,
          cevaplar: {
            uniformaVeIsg: r.uniformaVeIsg,
            musteriIletisimi: r.musteriIletisimi,
            planlamaKoordinasyon: r.planlamaKoordinasyon,
            teknikTespit: r.teknikTespit,
            raporDokumantasyon: r.raporDokumantasyon,
            genelLiderlik: r.genelLiderlik,
          },
          toplamPuan: Math.round(r.toplamPuan),
          kilitlendi: Boolean(r.kilitlendi),
          updatedAt: r.updatedAt,
        })),
        ...ciraklar.map((r) => ({
          tip: 'CIRAK' as const,
          personelId: r.personnelId,
          personelAd: r.personnelAd,
          cevaplar: {
            uniformaVeIsg: r.uniformaVeIsg,
            ekipIciDavranis: r.ekipIciDavranis,
            destekKalitesi: r.destekKalitesi,
            ogrenmeGelisim: r.ogrenmeGelisim,
          },
          toplamPuan: Math.round(r.toplamPuan),
          kilitlendi: Boolean(r.kilitlendi),
          updatedAt: r.updatedAt,
        })),
      ],
    });
  } catch (error) {
    console.error('GET /api/puanlama/yetkili error:', error);
    return NextResponse.json({ error: 'Yetkili değerlendirmeleri alınamadı' }, { status: 500 });
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

    const { personelId, ay, cevaplar, notlar, forceOverwrite } = parsed.data;
    const isAdmin = auth.payload.role === 'ADMIN';

    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, ad: true, unvan: true },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    if (personel.unvan === 'USTA') {
      const existing = await prisma.yetkiliDegerlendirmeUsta.findUnique({
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

      const scores = {
        uniformaVeIsg: toScore(cevaplar.uniformaVeIsg),
        musteriIletisimi: toScore(cevaplar.musteriIletisimi),
        planlamaKoordinasyon: toScore(cevaplar.planlamaKoordinasyon),
        teknikTespit: toScore(cevaplar.teknikTespit),
        raporDokumantasyon: toScore(cevaplar.raporDokumantasyon),
        genelLiderlik: toScore(cevaplar.genelLiderlik),
      };

      const toplamPuan = average(Object.values(scores));

      const saved = await prisma.yetkiliDegerlendirmeUsta.upsert({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        update: {
          ...scores,
          toplamPuan,
          notlar: notlar ?? null,
          yetkiliId: auth.payload.userId,
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
        toplamPuan: Math.round(saved.toplamPuan),
      });
    }

    const scores = {
      uniformaVeIsg: toScore(cevaplar.uniformaVeIsg),
      ekipIciDavranis: toScore(cevaplar.ekipIciDavranis),
      destekKalitesi: toScore(cevaplar.destekKalitesi),
      ogrenmeGelisim: toScore(cevaplar.ogrenmeGelisim),
    };

    const toplamPuan = average(Object.values(scores));
    const existing = await prisma.yetkiliDegerlendirmeCirak.findUnique({
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

    const saved = await prisma.yetkiliDegerlendirmeCirak.upsert({
      where: { personnelId_ay: { personnelId: personelId, ay } },
      update: {
        ...scores,
        toplamPuan,
        notlar: notlar ?? null,
        yetkiliId: auth.payload.userId,
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
      toplamPuan: Math.round(saved.toplamPuan),
    });
  } catch (error) {
    console.error('POST /api/puanlama/yetkili error:', error);
    return NextResponse.json({ error: 'Yetkili değerlendirmesi kaydedilemedi' }, { status: 500 });
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

    // Önce personeli bul
    const personel = await prisma.personel.findUnique({
      where: { id: personelId, deletedAt: null },
      select: { id: true, unvan: true },
    });

    if (!personel) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 });
    }

    let deleted = false;

    if (personel.unvan === 'USTA') {
      const existing = await prisma.yetkiliDegerlendirmeUsta.findUnique({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        select: { kilitlendi: true },
      });

      if (existing?.kilitlendi) {
        return NextResponse.json(
          { error: 'Kilitli değerlendirme silinemez. Önce kilidi açın.' },
          { status: 423 }
        );
      }

      const result = await prisma.yetkiliDegerlendirmeUsta.deleteMany({
        where: { personnelId: personelId, ay },
      });
      deleted = result.count > 0;
    } else {
      const existing = await prisma.yetkiliDegerlendirmeCirak.findUnique({
        where: { personnelId_ay: { personnelId: personelId, ay } },
        select: { kilitlendi: true },
      });

      if (existing?.kilitlendi) {
        return NextResponse.json(
          { error: 'Kilitli değerlendirme silinemez. Önce kilidi açın.' },
          { status: 423 }
        );
      }

      const result = await prisma.yetkiliDegerlendirmeCirak.deleteMany({
        where: { personnelId: personelId, ay },
      });
      deleted = result.count > 0;
    }

    if (!deleted) {
      return NextResponse.json(
        { error: 'Silinecek kayıt bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Değerlendirme başarıyla silindi',
    });
  } catch (error) {
    console.error('DELETE /api/puanlama/yetkili error:', error);
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
    return NextResponse.json({ error: 'Kilitleme işlemi başarısız' }, { status: 500 });
  }
}


