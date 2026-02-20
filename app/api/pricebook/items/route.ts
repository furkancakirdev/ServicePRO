import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';
import {
  mapPricebookItemDto,
  normalizeItemType,
  parseOptionalDecimal,
  toNullableText,
} from '@/lib/pricebook/shared';
import { PRICEBOOK_ITEM_TYPE_VALUES } from '@/types/pricebook';

const createItemSchema = z.object({
  tip: z.enum(PRICEBOOK_ITEM_TYPE_VALUES).default('HIZMET'),
  kod: z.string().trim().max(64).optional().nullable(),
  ad: z.string().trim().min(1).max(255),
  aciklama: z.string().trim().max(2000).optional().nullable(),
  birim: z.string().trim().max(32).optional().nullable(),
  varsayilanSureSaat: z.union([z.number(), z.string()]).optional().nullable(),
  varsayilanFiyat: z.union([z.number(), z.string()]).optional().nullable(),
  maliyet: z.union([z.number(), z.string()]).optional().nullable(),
  categoryId: z.string().trim().min(1).optional().nullable(),
  aktif: z.boolean().optional().default(true),
});

function parseBoolFilter(value: string | null): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = toNullableText(searchParams.get('q'));
    const tipRaw = toNullableText(searchParams.get('type'));
    const tip = tipRaw ? normalizeItemType(tipRaw) : undefined;
    const aktif = parseBoolFilter(searchParams.get('aktif'));
    const categoryId = toNullableText(searchParams.get('categoryId'));

    const items = await prisma.pricebookItem.findMany({
      where: {
        tip,
        aktif,
        categoryId: categoryId ?? undefined,
        OR: q
          ? [
              {
                ad: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                kod: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
      },
      include: {
        category: {
          select: {
            ad: true,
          },
        },
      },
      orderBy: [{ aktif: 'desc' }, { ad: 'asc' }],
      take: 500,
    });

    return NextResponse.json({
      items: items.map(mapPricebookItemDto),
    });
  } catch (error) {
    console.error('GET /api/pricebook/items error:', error);
    return NextResponse.json({ error: 'Pricebook item listesi getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createItemSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz pricebook item istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (payload.categoryId) {
        const category = await tx.pricebookCategory.findUnique({
          where: { id: payload.categoryId },
          select: { id: true },
        });

        if (!category) {
          return {
            kind: 'INVALID_CATEGORY' as const,
          };
        }
      }

      const item = await tx.pricebookItem.create({
        data: {
          organizationId: 'org_default',
          tip: payload.tip,
          kod: toNullableText(payload.kod),
          ad: payload.ad,
          aciklama: toNullableText(payload.aciklama),
          birim: toNullableText(payload.birim),
          varsayilanSureSaat: parseOptionalDecimal(payload.varsayilanSureSaat, 'Varsayilan sure'),
          varsayilanFiyat: parseOptionalDecimal(payload.varsayilanFiyat, 'Varsayilan fiyat'),
          maliyet: parseOptionalDecimal(payload.maliyet, 'Maliyet'),
          categoryId: payload.categoryId ?? null,
          aktif: payload.aktif,
        },
        include: {
          category: {
            select: {
              ad: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.PRICEBOOK_ITEM_CREATED,
        entityTipi: 'PricebookItem',
        entityId: item.id,
        detay: `Pricebook item olusturuldu: ${item.ad}`,
      });

      return {
        kind: 'OK' as const,
        item,
      };
    });

    if (created.kind === 'INVALID_CATEGORY') {
      return NextResponse.json({ error: 'Secilen kategori bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(mapPricebookItemDto(created.item), { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ayni kod ile baska bir item zaten var' }, { status: 409 });
    }

    if (error instanceof Error && error.message.includes('sayisal')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('POST /api/pricebook/items error:', error);
    return NextResponse.json({ error: 'Pricebook item olusturulamadi' }, { status: 500 });
  }
}
