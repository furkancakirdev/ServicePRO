import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { normalizeServisFilterState, type ServisFilterState } from '@/lib/servisler/filter-state';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const filtreDurumuSchema = z.object({
  tekneAdi: z.string().min(1).max(120).optional(),
  durum: z.array(z.string().min(1).max(80)).max(32).optional(),
  konum: z.array(z.string().min(1).max(80)).max(32).optional(),
  tarih: z.array(z.string().min(1).max(20)).max(90).optional(),
  queue: z.enum(['ALL', 'ACTIVE', 'OVERDUE', 'UNASSIGNED', 'UNSCHEDULED', 'WAITING']).optional(),
  groupBy: z.enum(['none', 'tekneAdi', 'lokasyonGroup']).optional(),
  datePreset: z.enum(['ALL', 'BUGUN', 'YARIN', 'BU_HAFTA']).optional(),
});

const kayitSchema = z.object({
  name: z.string().min(1).max(120),
  state: filtreDurumuSchema,
});

type KayitliFiltrePayload = {
  name: string;
  state: ServisFilterState;
};

function kullaniciFiltreKeyPrefixOlustur(userId: string): string {
  return `servis.savedFilter.${userId}.`;
}

function ayardanKayitliFiltreCoz(
  keyPrefix: string,
  ayar: {
    key: string;
    value: string;
    createdAt: Date;
    updatedAt: Date;
  }
) {
  const filtreId = ayar.key.replace(keyPrefix, '');
  if (!filtreId) return null;

  try {
    const payload = JSON.parse(ayar.value) as KayitliFiltrePayload;
    return {
      id: filtreId,
      name: payload.name,
      state: normalizeServisFilterState(payload.state),
      createdAt: ayar.createdAt,
      updatedAt: ayar.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const keyPrefix = kullaniciFiltreKeyPrefixOlustur(auth.payload.userId);

  const ayarlar = await prisma.systemSetting.findMany({
    where: {
      category: 'filters',
      key: {
        startsWith: keyPrefix,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const filtreler = ayarlar
    .map((ayar) => ayardanKayitliFiltreCoz(keyPrefix, ayar))
    .filter((filtre): filtre is NonNullable<typeof filtre> => Boolean(filtre));

  return NextResponse.json(filtreler);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = kayitSchema.parse(await request.json());
    const state = normalizeServisFilterState(body.state);
    if (Object.keys(state).length === 0) {
      return NextResponse.json(
        { error: 'Kaydedilecek en az bir aktif filtre olmalidir' },
        { status: 400 }
      );
    }

    const filtreId = crypto.randomUUID();
    const keyPrefix = kullaniciFiltreKeyPrefixOlustur(auth.payload.userId);
    const key = `${keyPrefix}${filtreId}`;

    const payload: KayitliFiltrePayload = {
      name: body.name.trim(),
      state,
    };

    const ayar = await prisma.systemSetting.create({
      data: {
        key,
        category: 'filters',
        description: `Kayitli filtre: ${payload.name}`,
        value: JSON.stringify(payload),
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        id: filtreId,
        name: payload.name,
        state: payload.state,
        createdAt: ayar.createdAt,
        updatedAt: ayar.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Gecersiz kayitli filtre verisi', detay: error.issues },
        { status: 400 }
      );
    }

    console.error('Kayitli filtre kayit hatasi:', error);
    return NextResponse.json({ error: 'Kayitli filtre olusturulamadi' }, { status: 500 });
  }
}

