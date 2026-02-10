import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { z } from 'zod';
import { hesaplaBireyselPuanWithCarpan } from '@/lib/scoring-calculator';

type RouteContext = { params: { id: string } };

const completeRequestSchema = z.object({
  personeller: z
    .array(
      z.object({
        personelId: z.string().min(1, 'personelId zorunludur'),
        rol: z.enum(['SORUMLU', 'DESTEK']),
      })
    )
    .min(1, 'En az bir personel atanmalıdır')
    .refine((list) => new Set(list.map((item) => item.personelId)).size === list.length, {
      message: 'Aynı personel birden fazla kez gönderilemez',
    }),
  bonusPersonelIds: z.array(z.string().min(1)).optional().default([]),
  kaliteKontrol: z.object({
    uniteModelVar: z.boolean(),
    uniteSaatiVar: z.boolean().default(false),
    uniteSaatiMuaf: z.boolean().default(false),
    uniteSeriNoVar: z.boolean(),
    aciklamaYeterli: z.boolean(),
    adamSaatVar: z.boolean().default(false),
    adamSaatMuaf: z.boolean().default(false),
    fotograflarVar: z.boolean(),
  }),
  zorlukOverride: z.enum(['RUTIN', 'ARIZA', 'PROJE']).optional(),
});

const ZORLUK_CARPANLARI: Record<string, number> = {
  RUTIN: 1.0,
  ARIZA: 1.2,
  PROJE: 1.5,
};

function mapIsTuruToZorluk(isTuru: string): 'RUTIN' | 'ARIZA' | 'PROJE' {
  if (isTuru === 'PAKET') return 'RUTIN';
  if (isTuru === 'ARIZA') return 'ARIZA';
  return 'PROJE';
}

function hesaplaKalitePuani(kaliteKontrol: z.infer<typeof completeRequestSchema>['kaliteKontrol']): number {
  const puanAlanlari: boolean[] = [
    kaliteKontrol.uniteModelVar,
    kaliteKontrol.uniteSeriNoVar,
    kaliteKontrol.aciklamaYeterli,
    kaliteKontrol.fotograflarVar,
  ];

  if (!kaliteKontrol.uniteSaatiMuaf) {
    puanAlanlari.push(kaliteKontrol.uniteSaatiVar);
  }

  if (!kaliteKontrol.adamSaatMuaf) {
    puanAlanlari.push(kaliteKontrol.adamSaatVar);
  }

  if (puanAlanlari.length === 0) return 1;
  return puanAlanlari.filter(Boolean).length / puanAlanlari.length;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = completeRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Geçersiz istek verisi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const service = await prisma.service.findUnique({
      where: { id: params.id, deletedAt: null },
      include: {
        personeller: {
          include: {
            personel: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Servis bulunamadı' }, { status: 404 });
    }

    if (service.durum === 'TAMAMLANDI' || service.tamamlanmaAt) {
      return NextResponse.json({ error: 'Servis zaten tamamlanmış' }, { status: 409 });
    }

    const zorlukSeviyesi = body.zorlukOverride ?? mapIsTuruToZorluk(service.isTuru);
    const zorlukCarpani = ZORLUK_CARPANLARI[zorlukSeviyesi] ?? 1.0;
    const raporBasarisi = hesaplaKalitePuani(body.kaliteKontrol);
    const bonusSet = new Set(body.bonusPersonelIds ?? []);

    await prisma.$transaction(async (tx) => {
      for (const personel of body.personeller) {
        const mevcutAtama = service.personeller.find((sp) => sp.personelId === personel.personelId);

        const personelKaydi = mevcutAtama?.personel
          ? mevcutAtama.personel
          : await tx.personel.findUnique({
              where: { id: personel.personelId, deletedAt: null },
              select: { id: true, ad: true },
            });

        if (!personelKaydi?.ad) {
          throw new Error(`Personel bulunamadı: ${personel.personelId}`);
        }

        if (!mevcutAtama) {
          await tx.servicePersonel.create({
            data: {
              servisId: service.id,
              personelId: personel.personelId,
              rol: personel.rol,
              bonus: bonusSet.has(personel.personelId),
            },
          });
        } else {
          await tx.servicePersonel.update({
            where: { id: mevcutAtama.id },
            data: {
              rol: personel.rol,
              bonus: bonusSet.has(personel.personelId),
            },
          });
        }

        const puan = hesaplaBireyselPuanWithCarpan(
          raporBasarisi,
          zorlukCarpani,
          personel.rol === 'SORUMLU' ? 'sorumlu' : 'destek',
          bonusSet.has(personel.personelId)
        );

        await tx.servisPuan.create({
          data: {
            servisId: service.id,
            personelId: personel.personelId,
            personelAd: personelKaydi.ad,
            rol: personel.rol,
            isTuru: service.isTuru,
            seriNoVar: body.kaliteKontrol.uniteSeriNoVar,
            fotografVar: body.kaliteKontrol.fotograflarVar,
            aciklamaVar: body.kaliteKontrol.aciklamaYeterli,
            saatVar: body.kaliteKontrol.uniteSaatiMuaf ? true : body.kaliteKontrol.uniteSaatiVar,
            raporBasarisi,
            hamPuan: puan.hamPuan,
            zorlukCarpani,
            finalPuan: puan.finalPuan,
            bonus: bonusSet.has(personel.personelId),
            notlar: JSON.stringify({ kaliteKontrol: body.kaliteKontrol }),
          },
        });
      }

      await tx.service.update({
        where: { id: service.id },
        data: {
          durum: 'TAMAMLANDI',
          tamamlanmaAt: new Date(),
          zorlukSeviyesi,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: 'COMPLETE',
          entityTipi: 'Service',
          entityId: service.id,
          detay: 'Servis tamamlandı ve puanlar işlendi',
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service complete error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
