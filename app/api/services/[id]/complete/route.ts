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
    uniteSaatiExcludeFromScoring: z.boolean().optional(),
    uniteSaatiMuaf: z.boolean().optional(),
    uniteSeriNoVar: z.boolean(),
    aciklamaYeterli: z.boolean(),
    adamSaatVar: z.boolean().default(false),
    adamSaatExcludeFromScoring: z.boolean().optional(),
    adamSaatMuaf: z.boolean().optional(),
    fotograflarVar: z.boolean(),
  }),
  zorlukOverride: z.enum(['RUTIN', 'ARIZA', 'PROJE']).optional(),
  kapanisOzeti: z
    .string()
    .trim()
    .min(5, 'Kapanış özeti zorunludur')
    .max(5000, 'Kapanış özeti çok uzun'),
});

const ZORLUK_CARPANLARI: Record<'RUTIN' | 'ARIZA' | 'PROJE', number> = {
  RUTIN: 1.0,
  ARIZA: 1.2,
  PROJE: 1.5,
};

const ZORLUK_IS_TURU_ESLEME: Record<'RUTIN' | 'ARIZA' | 'PROJE', 'PAKET' | 'ARIZA' | 'PROJE'> = {
  RUTIN: 'PAKET',
  ARIZA: 'ARIZA',
  PROJE: 'PROJE',
};

function mapIsTuruToZorluk(isTuru: string): 'RUTIN' | 'ARIZA' | 'PROJE' {
  if (isTuru === 'PAKET') return 'RUTIN';
  if (isTuru === 'ARIZA') return 'ARIZA';
  return 'PROJE';
}

type KaliteKontrolPayload = z.infer<typeof completeRequestSchema>['kaliteKontrol'];

function isUniteSaatiExcluded(kaliteKontrol: KaliteKontrolPayload): boolean {
  return Boolean(
    kaliteKontrol.uniteSaatiExcludeFromScoring ??
      kaliteKontrol.uniteSaatiMuaf ??
      false
  );
}

function isAdamSaatExcluded(kaliteKontrol: KaliteKontrolPayload): boolean {
  return Boolean(
    kaliteKontrol.adamSaatExcludeFromScoring ??
      kaliteKontrol.adamSaatMuaf ??
      false
  );
}

function hesaplaKalitePuani(kaliteKontrol: z.infer<typeof completeRequestSchema>['kaliteKontrol']): number {
  const puanAlanlari: boolean[] = [
    kaliteKontrol.uniteModelVar,
    kaliteKontrol.uniteSeriNoVar,
    kaliteKontrol.aciklamaYeterli,
    kaliteKontrol.fotograflarVar,
  ];

  if (!isUniteSaatiExcluded(kaliteKontrol)) {
    puanAlanlari.push(kaliteKontrol.uniteSaatiVar);
  }

  if (!isAdamSaatExcluded(kaliteKontrol)) {
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
    const zorlukIsTuru = ZORLUK_IS_TURU_ESLEME[zorlukSeviyesi];
    const aktifKatsayi = await prisma.zorlukKatsayi.findUnique({
      where: { isTuru: zorlukIsTuru },
      select: { id: true, carpan: true },
    });
    const zorlukCarpani = aktifKatsayi?.carpan ?? ZORLUK_CARPANLARI[zorlukSeviyesi];
    const savedMultiplierId = aktifKatsayi?.id ?? null;
    const raporBasarisi = hesaplaKalitePuani(body.kaliteKontrol);
    const uniteSaatiExcluded = isUniteSaatiExcluded(body.kaliteKontrol);
    const adamSaatExcluded = isAdamSaatExcluded(body.kaliteKontrol);
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
            saatVar: uniteSaatiExcluded ? true : body.kaliteKontrol.uniteSaatiVar,
            raporBasarisi,
            hamPuan: puan.hamPuan,
            zorlukCarpani,
            finalPuan: puan.finalPuan,
            bonus: bonusSet.has(personel.personelId),
            savedMultiplierId,
            notlar: JSON.stringify({
              kaliteKontrol: {
                ...body.kaliteKontrol,
                uniteSaatiExcludeFromScoring: uniteSaatiExcluded,
                adamSaatExcludeFromScoring: adamSaatExcluded,
              },
            }),
          },
        });
      }

      await tx.kapanisRaporu.upsert({
        where: { servisId: service.id },
        update: {
          uniteBilgileri: body.kaliteKontrol.uniteModelVar && body.kaliteKontrol.uniteSeriNoVar,
          fotograf: body.kaliteKontrol.fotograflarVar,
          adamSaat: body.kaliteKontrol.adamSaatVar,
          saatiOlmayanUnitePuanDisi: uniteSaatiExcluded,
          adamSaatUygulanmazPuanDisi: adamSaatExcluded,
          aciklama: body.kapanisOzeti,
          raporlayanPersonel: auth.payload.email || auth.payload.userId,
          raporTarihi: new Date(),
        },
        create: {
          servisId: service.id,
          uniteBilgileri: body.kaliteKontrol.uniteModelVar && body.kaliteKontrol.uniteSeriNoVar,
          fotograf: body.kaliteKontrol.fotograflarVar,
          tekneKonum: false,
          sarfMalzeme: false,
          adamSaat: body.kaliteKontrol.adamSaatVar,
          taseronBilgisi: false,
          stokMalzeme: false,
          saatiOlmayanUnitePuanDisi: uniteSaatiExcluded,
          adamSaatUygulanmazPuanDisi: adamSaatExcluded,
          aciklama: body.kapanisOzeti,
          raporlayanPersonel: auth.payload.email || auth.payload.userId,
          raporTarihi: new Date(),
        },
      });

      const completionDate = new Date();
      completionDate.setUTCHours(12, 0, 0, 0);

      await tx.service.update({
        where: { id: service.id },
        data: {
          durum: 'TAMAMLANDI',
          tamamlanmaAt: completionDate,
          tarih: completionDate,
          tahminiBitisTarihi: completionDate,
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
          detay: `Servis tamamlandı. Özet: ${body.kapanisOzeti.slice(0, 240)}`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      scoring: {
        zorlukSeviyesi,
        zorlukCarpani,
        savedMultiplierId,
      },
    });
  } catch (error) {
    console.error('Service complete error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
